<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $table = 'payments';
    
    protected $fillable = [
        'contract_id', 'amount', 'method', 'payment_date', 'status'
    ];

    public function contract() {
        return $this->belongsTo(RentalContract::class);
    }
}
