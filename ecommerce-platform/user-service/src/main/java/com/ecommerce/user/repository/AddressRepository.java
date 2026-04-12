package com.ecommerce.user.repository;

import com.ecommerce.user.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<Address, String> {

    List<Address> findByUserUserId(String userId);

    Optional<Address> findByAddressIdAndUserUserId(String addressId, String userId);

    @Modifying
    @Query("UPDATE Address a SET a.isDefault = false WHERE a.user.userId = :userId")
    void clearDefaultForUser(String userId);

    @Modifying
    @Query("UPDATE Address a SET a.isDefault = true WHERE a.addressId = :addressId AND a.user.userId = :userId")
    void setDefaultAddress(String addressId, String userId);
}
