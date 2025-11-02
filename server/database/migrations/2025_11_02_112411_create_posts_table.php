<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('categories');
            $table->string('title');
            $table->unsignedInteger('price')->comment('VND / tháng');
            $table->unsignedSmallInteger('area')->comment('m2');
            $table->string('address');
            $table->foreignId('province_id')->nullable()->constrained('provinces')->nullOnDelete();
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('ward_id')->nullable()->constrained('wards')->nullOnDelete();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->longText('content')->nullable();
            $table->enum('status', ['draft', 'published', 'hidden'])->default('published');
            $table->timestamp('published_at')->nullable();
            $table->unsignedSmallInteger('max_people')->nullable()->comment('Số người tối đa');
            $table->string('contact_phone', 20)->nullable()->comment('SĐT chủ trọ');
            $table->timestamps();

            $table->fullText(['title', 'content']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('posts');
    }
};
