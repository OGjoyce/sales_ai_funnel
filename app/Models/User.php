<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Auth\MustVerifyEmail as MustVerifyEmailTrait;
use Illuminate\Notifications\Notifiable;
use Laravel\Cashier\Billable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable([
    'name',
    'email',
    'password',
    'trial_ends_at',
    'subscription_status',
    'paypal_subscription_id',
    'subscription_ends_at',
    'welcomed_at',
    'is_admin',
])]
#[Hidden([
    'password',
    'two_factor_secret',
    'two_factor_recovery_codes',
    'remember_token',
    'paypal_subscription_id',
])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use Billable, HasFactory, MustVerifyEmailTrait, Notifiable, TwoFactorAuthenticatable;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'trial_ends_at' => 'datetime',
            'subscription_ends_at' => 'datetime',
            'welcomed_at' => 'datetime',
            'is_admin' => 'boolean',
        ];
    }

    public function isVeloraAdmin(): bool
    {
        if ($this->is_admin) {
            return true;
        }

        $allowlist = config('velora.admin_emails', []);

        return in_array($this->email, $allowlist, true);
    }

    public function hasActiveSubscription(): bool
    {
        if (in_array($this->subscription_status, ['active', 'comped'], true)) {
            return true;
        }

        if ($this->subscription_status === 'trial') {
            return $this->trial_ends_at === null || $this->trial_ends_at->isFuture();
        }

        return false;
    }

    public function isOnTrial(): bool
    {
        return $this->subscription_status === 'trial'
            && ($this->trial_ends_at === null || $this->trial_ends_at->isFuture());
    }

    public function trialDaysRemaining(): ?int
    {
        if (! $this->isOnTrial() || $this->trial_ends_at === null) {
            return null;
        }

        return max(0, (int) now()->diffInDays($this->trial_ends_at, false));
    }

    /**
     * @return array<string, mixed>
     */
    public function billingSummary(): array
    {
        return [
            'subscription_status' => $this->subscription_status,
            'trial_ends_at' => $this->trial_ends_at?->toDateString(),
            'trial_days_remaining' => $this->trialDaysRemaining(),
            'is_on_trial' => $this->isOnTrial(),
            'has_access' => $this->hasActiveSubscription() || $this->isVeloraAdmin(),
            'plan_name' => config('velora.plan_name'),
            'trial_days' => (int) config('velora.trial_days', 7),
        ];
    }
}
