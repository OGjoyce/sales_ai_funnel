<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class GrantVeloraAdminCommand extends Command
{
    protected $signature = 'user:grant-admin {email : User email}';

    protected $description = 'Grant Velora admin (Invoker + /admins) to a user';

    public function handle(): int
    {
        $user = User::query()->where('email', $this->argument('email'))->first();

        if ($user === null) {
            $this->error('User not found.');

            return self::FAILURE;
        }

        $user->forceFill(['is_admin' => true])->save();

        $this->info("Admin granted to {$user->email} (id={$user->id}).");

        return self::SUCCESS;
    }
}
