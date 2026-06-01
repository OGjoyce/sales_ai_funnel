<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class GrantUserTrialCommand extends Command
{
    protected $signature = 'user:grant-trial {email : User email} {--days=7 : Trial length in days}';

    protected $description = 'Grant or extend a Velora trial for a user';

    public function handle(): int
    {
        $user = User::query()->where('email', $this->argument('email'))->first();

        if ($user === null) {
            $this->error('User not found.');

            return self::FAILURE;
        }

        $days = max(1, (int) $this->option('days'));

        $user->forceFill([
            'subscription_status' => 'trial',
            'trial_ends_at' => now()->addDays($days),
        ])->save();

        $this->info("Trial granted until {$user->trial_ends_at} for {$user->email}");

        return self::SUCCESS;
    }
}
