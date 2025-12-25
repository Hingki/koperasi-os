export interface WhatsappConfig {
  provider: 'mock' | 'twilio' | 'fonnte' | 'wablas';
  apiKey: string;
  baseUrl?: string;
  senderNumber?: string;
}

export interface WhatsappMessage {
  to: string;
  message: string;
  mediaUrl?: string;
}

export class WhatsappService {
  constructor(private config: WhatsappConfig) {}

  async sendMessage(to: string, message: string): Promise<boolean> {
    // Normalize phone number (e.g., 081 -> 6281)
    const formattedTo = this.formatPhoneNumber(to);

    switch (this.config.provider) {
      case 'mock':
        console.log(`[MOCK WA] To: ${formattedTo}, Msg: ${message}`);
        return true;
      case 'fonnte':
        return this.sendFonnte(formattedTo, message);
      default:
        console.warn('Provider not implemented');
        return false;
    }
  }

  async sendBlast(recipients: string[], message: string) {
    let successCount = 0;
    for (const recipient of recipients) {
      try {
        const success = await this.sendMessage(recipient, message);
        if (success) successCount++;
      } catch (err) {
        console.error(`Failed to send to ${recipient}`, err);
      }
    }
    return { success: successCount, total: recipients.length };
  }

  private formatPhoneNumber(phone: string): string {
    let p = phone.replace(/\D/g, '');
    if (p.startsWith('0')) {
      p = '62' + p.slice(1);
    }
    return p;
  }

  private async sendFonnte(to: string, message: string): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('target', to);
      formData.append('message', message);
      
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': this.config.apiKey
        },
        body: formData
      });
      
      const result = await response.json();
      return result.status === true;
    } catch (err) {
      console.error('Fonnte Error:', err);
      return false;
    }
  }
}
