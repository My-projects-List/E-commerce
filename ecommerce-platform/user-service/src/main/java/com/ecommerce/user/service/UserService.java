package com.ecommerce.user.service;

import com.ecommerce.user.dto.*;
import com.ecommerce.user.entity.User;

import java.util.List;

/**
 * User service interface — defines all user-facing operations.
 */
public interface UserService {

    // ---- Authentication ----
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    AuthResponse refreshToken(String refreshToken);
    void logout(String userId);

    // ---- Profile ----
    UserProfileDto getProfile(String userId);
    UserProfileDto updateProfile(String userId, UpdateProfileRequest request);
    void changePassword(String userId, ChangePasswordRequest request);
    void deactivateAccount(String userId);

    // ---- Addresses ----
    AddressDto addAddress(String userId, AddressDto addressDto);
    List<AddressDto> getAddresses(String userId);
    AddressDto updateAddress(String userId, String addressId, AddressDto addressDto);
    void deleteAddress(String userId, String addressId);
    void setDefaultAddress(String userId, String addressId);

    // ---- Wishlist ----
    void addToWishlist(String userId, String productId);
    void removeFromWishlist(String userId, String productId);
    List<String> getWishlist(String userId);

    // Internal helper
    User findById(String userId);
}
