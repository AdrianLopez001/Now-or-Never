package com.nowornever.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${app.rabbitmq.predictions-queue}")
    private String queueName;

    @Value("${app.rabbitmq.predictions-exchange}")
    private String exchangeName;

    @Value("${app.rabbitmq.predictions-routing-key}")
    private String routingKey;

    @Bean
    public Queue predictionsQueue() {
        return new Queue(queueName, true);
    }

    @Bean
    public DirectExchange predictionsExchange() {
        return new DirectExchange(exchangeName);
    }

    @Bean
    public Binding predictionsBinding(Queue predictionsQueue, DirectExchange predictionsExchange) {
        return BindingBuilder.bind(predictionsQueue).to(predictionsExchange).with(routingKey);
    }

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public AmqpTemplate amqpTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(messageConverter());
        return rabbitTemplate;
    }
}
