<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportLog extends Model
{
    protected $fillable = ['filename', 'type', 'format', 'size', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
