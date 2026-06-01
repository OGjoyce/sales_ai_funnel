<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class WelcomeNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $appUrl = rtrim((string) config('app.url'), '/');

        return (new MailMessage)
            ->subject('Bienvenido a Velora')
            ->greeting('¡Hola, '.$notifiable->name.'!')
            ->line('Tu correo está verificado y tu cuenta está lista.')
            ->action('Abrir el embudo CRM', $appUrl.'/crm/kanban')
            ->line('Pregunta a Fernando en la landing si necesitas orientación.')
            ->action('Hablar con Fernando', $appUrl.'/?chat=fernando')
            ->line('Soporte: '.config('velora.support_email'))
            ->when(
                filled(config('velora.calendly_url')),
                fn (MailMessage $m) => $m->action(
                    'Agendar consulta',
                    (string) config('velora.calendly_url'),
                ),
            );
    }
}
