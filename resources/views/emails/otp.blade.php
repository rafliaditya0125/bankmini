@php
    $appName = \App\Models\Setting::get('app_name', config('app.name'));
@endphp
<x-mail::message>
# Kode OTP {{ $appName }}

Kode OTP Anda adalah:

<x-mail::panel>
## {{ $otp }}
</x-mail::panel>

Kode ini berlaku selama 15 menit. Jangan berikan kode ini kepada siapapun demi keamanan akun Anda.

Terima kasih,<br>
{{ $appName }}
</x-mail::message>
