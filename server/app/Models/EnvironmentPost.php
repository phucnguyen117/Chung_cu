<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EnvironmentPost extends Model
{
    protected $table = 'environment_post';
    protected $fillable = ['post_id', 'environment_id'];

    public function post()
    {
        return $this->belongsTo(Post::class);
    }

    public function environment()
    {
        return $this->belongsTo(EnvironmentFeature::class, 'environment_id');
    }
}
