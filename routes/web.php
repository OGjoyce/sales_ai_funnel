<?php

use App\Http\Controllers\BillingPageController;
use App\Http\Controllers\Crm\KanbanPageController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'landing', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::inertia('about', 'about', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('about');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('billing', BillingPageController::class)->name('billing');
    Route::inertia('crm/help', 'crm/help')->name('crm.help');
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
