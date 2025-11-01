<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AmenityPost extends Model
{
    protected $table = 'amenity_post';
    protected $fillable = ['post_id', 'amenity_id'];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function amenity()
    {
        return $this->belongsTo(Amenity::class);
    }
}
