<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlogPostTag extends Model
{
    protected $table = 'blog_post_tag';
    protected $fillable = ['blog_post_id', 'blog_tag_id'];

    public function blogPost()
    {
        return $this->belongsTo(BlogPost::class);
    }

    public function blogTag()
    {
        return $this->belongsTo(BlogTag::class);
    }
}
