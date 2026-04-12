package com.ecommerce.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Base exception for the e-commerce platform.
 */
@Getter
public class EcommerceException extends RuntimeException {

    private final HttpStatus status;
    private final String errorCode;

    public EcommerceException(String message, HttpStatus status, String errorCode) {
        super(message);
        this.status = status;
        this.errorCode = errorCode;
    }

    public EcommerceException(String message, HttpStatus status) {
        this(message, status, status.name());
    }
}
