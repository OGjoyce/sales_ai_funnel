<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = $request->query('search', '');
        $limit = min(100, max(1, (int) $request->query('limit', 50)));

        $query = Product::query()->orderBy('title');

        if (is_string($q) && $q !== '') {
            $query->where(function ($sub) use ($q) {
                $sub->where('title', 'like', '%'.$q.'%')
                    ->orWhere('code', 'like', '%'.$q.'%')
                    ->orWhere('description', 'like', '%'.$q.'%');
            });
        }

        $products = $query->limit($limit)->get();

        return response()->json(['products' => $products]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'code' => 'required|string|max:100|unique:products,code',
            'price' => 'required|numeric|min:0',
            'currency' => 'nullable|string|max:8',
            'stock' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean',
            'image' => 'nullable|image|max:10240',
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        unset($data['image']);
        $data['currency'] = $data['currency'] ?? 'USD';
        $data['active'] = $data['active'] ?? true;

        $product = Product::create($data);

        return response()->json(['product' => $this->transform($product)], 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'code' => 'sometimes|string|max:100|unique:products,code,'.$product->id,
            'price' => 'sometimes|numeric|min:0',
            'currency' => 'nullable|string|max:8',
            'stock' => 'nullable|integer|min:0',
            'active' => 'nullable|boolean',
            'image' => 'nullable|image|max:10240',
        ]);

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        unset($data['image']);
        $product->update($data);

        return response()->json(['product' => $this->transform($product->fresh())]);
    }

    public function destroy(Product $product): JsonResponse
    {
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }
        $product->delete();

        return response()->json(['ok' => true]);
    }

    private function transform(Product $product): array
    {
        $arr = $product->toArray();
        if ($product->image_path) {
            $arr['image_url'] = Storage::disk('public')->url($product->image_path);
        } else {
            $arr['image_url'] = null;
        }

        return $arr;
    }
}
