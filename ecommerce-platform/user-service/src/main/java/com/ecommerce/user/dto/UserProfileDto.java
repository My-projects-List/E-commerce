package com.ecommerce.user.dto;

import com.ecommerce.user.entity.User.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileDto {
    private String userId;
    private String name;
    private String email;
    private String phoneNumber;
    private UserRole role;
    private boolean emailVerified;
    private LocalDateTime createdAt;
    private List<AddressDto> addresses;
}
