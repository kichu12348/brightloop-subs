export interface Mailer {
  sendPasswordResetEmail(email: string, rawToken: string): Promise<void>;
}

export class InMemoryMailer implements Mailer {
  public sentEmails: Array<{ email: string; rawToken: string }> = [];

  public async sendPasswordResetEmail(
    email: string,
    rawToken: string,
  ): Promise<void> {
    this.sentEmails.push({ email, rawToken });
  }

  public clear(): void {
    this.sentEmails = [];
  }
}

