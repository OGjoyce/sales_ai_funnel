<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Concerns\SharesBillingPageData;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    use SharesBillingPageData;

    public function edit(): Response
    {
        return Inertia::render('settings/billing', $this->billingPageProps(request()->user()));
    }
}
