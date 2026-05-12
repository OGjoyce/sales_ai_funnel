# Build stage for frontend assets
FROM node:22-alpine AS frontend
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# PHP + Laravel production image
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    postgresql-client \
    postgresql-dev \
    libpq-dev \
    oniguruma-dev \
    zip \
    unzip \
    git \
    curl \
    supervisor \
    nginx

# PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    mbstring \
    bcmath \
    pcntl

RUN pecl install redis && docker-php-ext-enable redis

WORKDIR /app

# Copy composer files
COPY composer.json composer.lock ./
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Install PHP dependencies
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader

# Copy application files
COPY . .

# Copy built frontend assets from node stage
COPY --from=frontend /app/public ./public

# Create necessary directories with proper permissions
RUN mkdir -p storage/logs storage/app storage/framework/{cache,sessions,views} bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache public

# Laravel optimization
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# Copy supervisord config
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8000

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
