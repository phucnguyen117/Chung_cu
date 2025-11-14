<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Amenity extends Model
{
    protected $table = 'amenities';

    protected $fillable = ['slug', 'name'];

    public $timestamps = false;

    public function posts() {
        return $this->belongsToMany(Post::class, 'amenity_post');
    }
}

