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
    nginx \
    zlib-dev \
    libpng-dev \
    freetype-dev \
    $PHPIZE_DEPS

# PHP extensions (core required ones)
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    mbstring \
    bcmath \
    pcntl

RUN pecl install redis && docker-php-ext-enable redis && \
    apk del $PHPIZE_DEPS

WORKDIR /app

# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy application files (includes pre-built frontend assets in public/build/)
COPY . .

# Install PHP dependencies (ignore platform reqs for extensions we don't need in Docker)
# Skip scripts to avoid artisan commands running before app is fully set up
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --ignore-platform-reqs --no-scripts

# Create necessary directories with proper permissions
RUN mkdir -p storage/logs storage/app storage/framework/{cache,sessions,views} bootstrap/cache /var/log/supervisor \
    && chown -R www-data:www-data storage bootstrap/cache public

# Laravel optimization
RUN php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

# Copy supervisord config
COPY docker/supervisord.conf /etc/supervisord.conf

EXPOSE 8000

CMD ["supervisord", "-c", "/etc/supervisord.conf"]
