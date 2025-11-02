<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug', 191)->unique();
            $table->string('excerpt', 500)->nullable();
            $table->longText('content');
            $table->string('cover', 255)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->fullText(['title', 'content']);
        });
    }

    public function down(): void {
        Schema::dropIfExists('blog_posts');
    }
};