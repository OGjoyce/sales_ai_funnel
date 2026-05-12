<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'landing', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::inertia('crm/kanban', 'crm/kanban')->name('crm.kanban');
    Route::inertia('crm/products', 'crm/products')->name('crm.products');
    Route::inertia('crm/agent', 'crm/agent')->name('crm.agent');
    Route::inertia('crm/training', 'crm/training')->name('crm.training');
    Route::inertia('crm/playground', 'crm/playground')->name('crm.playground');
    Route::inertia('crm/metrics', 'crm/metrics')->name('crm.metrics');
});

require __DIR__.'/settings.php';
