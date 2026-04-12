package com.ecommerce.order.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "user-service")
public interface UserServiceClient {

    @GetMapping("/api/users/addresses/{addressId}")
    AddressSummary getAddress(
            @RequestHeader("X-User-Id") String userId,
            @PathVariable String addressId);

    record AddressSummary(
        String addressId, String fullName, String street,
        String city, String state, String zipCode, String country
    ) {}
}
