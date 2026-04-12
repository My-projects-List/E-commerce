package com.ecommerce.user.service.impl;

import com.ecommerce.common.events.UserActivityEvent;
import com.ecommerce.common.exception.EcommerceException;
import com.ecommerce.common.exception.ResourceNotFoundException;
import com.ecommerce.common.kafka.KafkaTopics;
import com.ecommerce.user.dto.*;
import com.ecommerce.user.entity.Address;
import com.ecommerce.user.entity.User;
import com.ecommerce.user.repository.AddressRepository;
import com.ecommerce.user.repository.UserRepository;
import com.ecommerce.user.security.JwtTokenProvider;
import com.ecommerce.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final String REFRESH_TOKEN_PREFIX = "refresh_token:";
    private static final long REFRESH_TOKEN_TTL_DAYS = 7;

    private final UserRepository userRepository;
    private final AddressRepository addressRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RedisTemplate<String, String> redisTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // ---- Authentication ----

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EcommerceException("Email already in use", HttpStatus.CONFLICT, "EMAIL_TAKEN");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .phoneNumber(request.getPhoneNumber())
                .role(User.UserRole.CUSTOMER)
                .build();

        user = userRepository.save(user);
        log.info("New user registered: {}", user.getUserId());

        // Publish registration event
        kafkaTemplate.send(KafkaTopics.USER_REGISTERED,
                UserActivityEvent.builder()
                        .eventId(UUID.randomUUID().toString())
                        .userId(user.getUserId())
                        .activityType(UserActivityEvent.ActivityType.PRODUCT_VIEW)
                        .occurredAt(LocalDateTime.now())
                        .build());

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail().toLowerCase())
                .orElseThrow(() -> new EcommerceException("Invalid credentials", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS"));

        if (!user.isActive()) {
            throw new EcommerceException("Account is deactivated", HttpStatus.FORBIDDEN, "ACCOUNT_DEACTIVATED");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new EcommerceException("Invalid credentials", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
        }

        userRepository.updateLastLoginAt(user.getUserId(), LocalDateTime.now());
        log.info("User logged in: {}", user.getUserId());

        return buildAuthResponse(user);
    }

    @Override
    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new EcommerceException("Invalid refresh token", HttpStatus.UNAUTHORIZED, "INVALID_TOKEN");
        }

        String userId = jwtTokenProvider.extractUserId(refreshToken);
        String storedToken = redisTemplate.opsForValue().get(REFRESH_TOKEN_PREFIX + userId);

        if (!refreshToken.equals(storedToken)) {
            throw new EcommerceException("Refresh token revoked", HttpStatus.UNAUTHORIZED, "TOKEN_REVOKED");
        }

        User user = findById(userId);
        return buildAuthResponse(user);
    }

    @Override
    public void logout(String userId) {
        redisTemplate.delete(REFRESH_TOKEN_PREFIX + userId);
        log.info("User logged out: {}", userId);
    }

    // ---- Profile ----

    @Override
    @Transactional(readOnly = true)
    public UserProfileDto getProfile(String userId) {
        User user = findById(userId);
        return mapToProfileDto(user);
    }

    @Override
    @Transactional
    public UserProfileDto updateProfile(String userId, UpdateProfileRequest request) {
        User user = findById(userId);

        if (request.getName() != null) user.setName(request.getName());
        if (request.getPhoneNumber() != null) user.setPhoneNumber(request.getPhoneNumber());

        return mapToProfileDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public void changePassword(String userId, ChangePasswordRequest request) {
        User user = findById(userId);

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new EcommerceException("Current password is incorrect", HttpStatus.BAD_REQUEST, "WRONG_PASSWORD");
        }

        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // Invalidate all sessions by removing refresh token
        redisTemplate.delete(REFRESH_TOKEN_PREFIX + userId);
        log.info("Password changed for user: {}", userId);
    }

    @Override
    @Transactional
    public void deactivateAccount(String userId) {
        userRepository.deactivateUser(userId);
        redisTemplate.delete(REFRESH_TOKEN_PREFIX + userId);
        log.info("Account deactivated: {}", userId);
    }

    // ---- Addresses ----

    @Override
    @Transactional
    public AddressDto addAddress(String userId, AddressDto dto) {
        User user = findById(userId);

        // If this is the first address, make it default
        boolean isFirst = user.getAddresses().isEmpty();

        Address address = Address.builder()
                .user(user)
                .fullName(dto.getFullName())
                .street(dto.getStreet())
                .city(dto.getCity())
                .state(dto.getState())
                .zipCode(dto.getZipCode())
                .country(dto.getCountry())
                .phoneNumber(dto.getPhoneNumber())
                .isDefault(isFirst || dto.isDefault())
                .build();

        address = addressRepository.save(address);
        return mapToAddressDto(address);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AddressDto> getAddresses(String userId) {
        return addressRepository.findByUserUserId(userId)
                .stream()
                .map(this::mapToAddressDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AddressDto updateAddress(String userId, String addressId, AddressDto dto) {
        Address address = addressRepository.findByAddressIdAndUserUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", addressId));

        if (dto.getStreet() != null)  address.setStreet(dto.getStreet());
        if (dto.getCity() != null)    address.setCity(dto.getCity());
        if (dto.getState() != null)   address.setState(dto.getState());
        if (dto.getZipCode() != null) address.setZipCode(dto.getZipCode());
        if (dto.getCountry() != null) address.setCountry(dto.getCountry());

        return mapToAddressDto(addressRepository.save(address));
    }

    @Override
    @Transactional
    public void deleteAddress(String userId, String addressId) {
        Address address = addressRepository.findByAddressIdAndUserUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "addressId", addressId));
        addressRepository.delete(address);
    }

    @Override
    @Transactional
    public void setDefaultAddress(String userId, String addressId) {
        // Clear existing default
        addressRepository.clearDefaultForUser(userId);
        // Set new default
        addressRepository.setDefaultAddress(addressId, userId);
    }

    // ---- Wishlist ----

    @Override
    @Transactional
    public void addToWishlist(String userId, String productId) {
        User user = findById(userId);
        user.getWishlistProductIds().add(productId);
        userRepository.save(user);
    }

    @Override
    @Transactional
    public void removeFromWishlist(String userId, String productId) {
        User user = findById(userId);
        user.getWishlistProductIds().remove(productId);
        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<String> getWishlist(String userId) {
        User user = findById(userId);
        return List.copyOf(user.getWishlistProductIds());
    }

    // ---- Internal ----

    @Override
    public User findById(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "userId", userId));
    }

    // ---- Private helpers ----

    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtTokenProvider.generateAccessToken(user);
        String refreshToken = jwtTokenProvider.generateRefreshToken(user);

        // Store refresh token in Redis
        redisTemplate.opsForValue().set(
                REFRESH_TOKEN_PREFIX + user.getUserId(),
                refreshToken,
                REFRESH_TOKEN_TTL_DAYS,
                TimeUnit.DAYS);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpiryMs() / 1000)
                .user(mapToProfileDto(user))
                .build();
    }

    private UserProfileDto mapToProfileDto(User user) {
        return UserProfileDto.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .addresses(user.getAddresses().stream()
                        .map(this::mapToAddressDto)
                        .collect(Collectors.toList()))
                .build();
    }

    private AddressDto mapToAddressDto(Address address) {
        return AddressDto.builder()
                .addressId(address.getAddressId())
                .fullName(address.getFullName())
                .street(address.getStreet())
                .city(address.getCity())
                .state(address.getState())
                .zipCode(address.getZipCode())
                .country(address.getCountry())
                .phoneNumber(address.getPhoneNumber())
                .isDefault(address.isDefault())
                .build();
    }
}
