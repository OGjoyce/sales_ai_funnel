<?php

use App\Http\Controllers\Auth\SkipEmailVerificationController;
use App\Http\Controllers\BillingPageController;
use App\Http\Controllers\Crm\KanbanPageController;
use App\Http\Controllers\PayPal\PayPalCheckoutController;
use App\Http\Controllers\PayPal\PayPalWebhookController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'landing', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::inertia('about', 'about', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('about');

Route::middleware(['auth'])->group(function () {
    Route::post('email/verify/skip', SkipEmailVerificationController::class)
        ->name('verification.skip');
});

Route::post('webhooks/paypal', PayPalWebhookController::class)->name('webhooks.paypal');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('billing', BillingPageController::class)->name('billing');
    Route::post('billing/paypal/subscribe', [PayPalCheckoutController::class, 'subscribe'])
        ->name('billing.paypal.subscribe');
    Route::get('billing/paypal/return', [PayPalCheckoutController::class, 'return'])
        ->name('billing.paypal.return');
    Route::get('billing/paypal/cancel', [PayPalCheckoutController::class, 'cancel'])
        ->name('billing.paypal.cancel');
    Route::redirect('crm/help', '/?chat=fernando')->name('crm.help');
});

Route::middleware(['auth', 'verified', 'velora.admin'])->prefix('admins')->group(function () {
    Route::inertia('/', 'admins/index')->name('admins.index');
    Route::inertia('invoker', 'admins/invoker')->name('admins.invoker');
    Route::inertia('logs', 'admins/logs')->name('admins.logs');
});

Route::middleware(['auth', 'verified', 'subscription'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::get('crm/kanban', KanbanPageController::class)->name('crm.kanban');
    Route::inertia('crm/products', 'crm/products')->name('crm.products');
    Route::inertia('crm/agent', 'crm/agent')->name('crm.agent');
    Route::inertia('crm/training', 'crm/training')->name('crm.training');
    Route::inertia('crm/playground', 'crm/playground')->name('crm.playground');
    Route::inertia('crm/metrics', 'crm/metrics')->name('crm.metrics');
});

require __DIR__.'/settings.php';
