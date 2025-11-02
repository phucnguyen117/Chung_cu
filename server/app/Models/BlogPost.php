<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogPost extends Model
{
    protected $table = 'blog_posts';

    protected $fillable = ['title', 'slug', 'excerpt', 'content', 'cover', 'published_at'];

    public function tags() {
        return $this->belongsToMany(BlogTag::class, 'blog_post_tag');
    }
}

