<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogTag extends Model
{
    protected $table = 'blog_tags';
    
    protected $fillable = ['slug', 'name'];

    public function posts() {
        return $this->belongsToMany(BlogPost::class, 'blog_post_tag');
    }
}

