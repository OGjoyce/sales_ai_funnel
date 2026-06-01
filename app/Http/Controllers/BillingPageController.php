<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\SharesBillingPageData;
use Inertia\Inertia;
use Inertia\Response;

class BillingPageController extends Controller
{
    use SharesBillingPageData;

    public function __invoke(): Response
    {
        return Inertia::render('billing', $this->billingPageProps(request()->user()));
    }
}
