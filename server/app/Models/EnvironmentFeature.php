<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvironmentFeature extends Model
{
    protected $table = 'environment_features';
    
    protected $fillable = ['slug', 'name'];

    public $timestamps = false;

    public function posts() {
        return $this->belongsToMany(Post::class, 'environment_post');
    }
}

