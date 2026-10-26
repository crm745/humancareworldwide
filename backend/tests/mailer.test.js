// src/lib/mailer.js: which provider sends, and with what sender. nodemailer is replaced
// by a stand-in, so nothing is really sent.
const mockSendMail = jest.fn().mockResolvedValue({});
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.mock('nodemailer', () => ({ createTransport: (...args) => mockCreateTransport(...args) }));

const KEYS = ['EMAIL_PROVIDER', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM', 'NODE_ENV'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
const message = { to: 'someone@example.com', subject: 'Hello', text: 'Body', html: '<p>Body</p>' };

function freshMailer(env) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, env);
  let mailer;
  jest.isolateModules(() => { mailer = require('../src/lib/mailer'); });
  return mailer;
}

afterEach(() => {
  mockSendMail.mockClear();
  mockCreateTransport.mockClear();
  for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }
});

describe('mailer', () => {
  it('sends through the Google Workspace mailbox (SMTP) when SMTP_USER/SMTP_PASS are set', async () => {
    const { sendMail } = freshMailer({
      SMTP_USER: 'crm@humancareworldwide.com',
      SMTP_PASS: 'app-password',
      EMAIL_FROM: 'HumanCare World Wide <crm@humancareworldwide.com>',
    });
    await sendMail(message);
    expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: 'crm@humancareworldwide.com', pass: 'app-password' },
    }));
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: 'HumanCare World Wide <crm@humancareworldwide.com>', to: 'someone@example.com', subject: 'Hello',
    }));
  });

  it('only prints the email in development when no mailbox is configured', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const { sendMail } = freshMailer({ NODE_ENV: 'development' });
    await sendMail(message);
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(log.mock.calls[0][0]).toMatch(/DEV ONLY/);
    log.mockRestore();
  });

  it('refuses to "send" to the console in production', async () => {
    const { sendMail } = freshMailer({ NODE_ENV: 'production' });
    await expect(sendMail(message)).rejects.toThrow(/production/);
  });
});
