package com.homemitra.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    /**
     * Same env var as CORS — keeps everything in sync.
     * Falls back to localhost for local dev.
     */
    @Value("${app.cors.allowed-origins}")
    private String allowedOriginsRaw;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = allowedOriginsRaw.split(",");
        registry.addEndpoint("/ws")
            .setAllowedOrigins(origins)
            .withSockJS();
    }
}
