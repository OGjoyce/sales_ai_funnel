# PHP + Laravel production image
#
# Laravel 13 + Symfony 8 require PHP 8.4+ at runtime (e.g. ReflectionProperty::isVirtual()).
FROM php:8.4-fpm-alpine

RUN apk add --no-cache \
    postgresql-client \
    postgresql-dev \
    libpq-dev \
    oniguruma-dev \
    libzip-dev \
    zip \
    unzip \
    git \
    curl \
    supervisor \
    nginx \
    zlib-dev \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    $PHPIZE_DEPS

# PHP extensions (core required ones)
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
    pdo \
    pdo_pgsql \
    mbstring \
    bcmath \
    pcntl \
    intl \
    gd \
    zip

RUN pecl install redis && docker-php-ext-enable redis && \
    apk del $PHPIZE_DEPS

WORKDIR /app

# Install composer
RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

# Copy application files (includes pre-built frontend assets in public/build/)
COPY . .

# Install PHP dependencies (no scripts until runtime is ready)
RUN composer install --no-dev --no-interaction --no-progress --optimize-autoloader --no-scripts

# Create necessary directories with proper permissions
RUN mkdir -p storage/logs storage/app storage/framework/{cache,sessions,views} bootstrap/cache /var/log/supervisor \
    && chown -R www-data:www-data storage bootstrap/cache public

# Laravel optimization (disabled for Docker - will run after DB is available)
# RUN php artisan config:cache \
#     && php artisan route:cache \
#     && php artisan view:cache

# Copy supervisord config and entrypoint
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN sed -i 's/\r$//' /usr/local/bin/entrypoint.sh && chmod +x /usr/local/bin/entrypoint.sh

# Install additional runtime dependencies (psql for health checks, redis-cli)
RUN apk add --no-cache postgresql-client redis

EXPOSE 8000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
