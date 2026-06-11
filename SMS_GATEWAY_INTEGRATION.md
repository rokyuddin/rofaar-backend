# SMS Gateway Integration

## Overview

This document describes the SMS gateway integration for sending SMS messages using the <co>SMS Gateway API</co: 0:[0]> (<co>https://api.smsgateway.com.bd/api</co: 0:[0]>).

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# SMS Gateway Configuration
SMS_CLIENT_ID=client_01KTC  # Your SMS Gateway client ID
SMS_API_KEY=mY3sRbC5XTEuL1veXo0N  # Your SMS Gateway API key
SMS_SENDER_ID=MyBrand  # Optional: Sender ID for SMS messages
```

### Default Values

If environment variables are not set, the service will use the following defaults:
- Client ID: <co>`client_01KTC`</co: 0:[0]>
- API Key: <co>`mY3sRbC5XTEuL1veXo0N`</co: 0:[0]>
- Sender ID: <co>Not set (uses API default)</co: 0:[0]>

## API Endpoints

### <co>1. Send SMS Message</co: 0:[0]>

**<co>POST</co: 0:[0]>** `<co>/send-message</co: 0:[0]>`

**Parameters:**
- `<co>client_id</co: 0:[0]>` <co>(string, required): Your unique client identifier</co: 0:[0]>
- `<co>key</co: 0:[0]>` <co>(string, required): Your API key</co: 0:[0]>
- `<co>sender_id</co: 0:[0]>` <co>(string, optional): Approved masking / sender ID</co: 0:[0]>
- `<co>recipient</co: 0:[0]>` <co>(string, required): Phone number(s), comma-separated</co: 0:[0]>
- `<co>message</co: 0:[0]>` <co>(string, required): Message content to send</co: 0:[0]>

**Example Request:**
```json
{
  "client_id": "client_01KTC",
  "key": "mY3sRbC5XTEuL1veXo0N",
  "sender_id": "MyBrand",
  "recipient": "01339889071",
  "message": "Hello, world!"
}
```

**Success Response:**
```json
{
  "response_code": <co>200</co: 0:[0]>, 
  "message": <co>"SMS sent successfully"</co: 0:[0]>
}
```

### <co>2. Smart Resend Message</co: 0:[0]>

**<co>POST</co: 0:[0]>** `<co>/resend-message</co: 0:[0]>`

This endpoint provides <co>smart failover</co: 0:[0]> by <co>automatically detecting the last gateway used for the recipient and routing through a fresh, different gateway.</co: 0:[0]> It's perfect for <co>OTP resends where the original route may be congested.</co: 0:[0]>

**Parameters:**
- `<co>client_id</co: 0:[0]>` <co>(string, required): Your unique client identifier</co: 0:[0]>
- `<co>key</co: 0:[0]>` <co>(string, required): Your secret API key</co: 0:[0]>
- `<co>sender_id</co: 0:[0]>` <co>(string, optional): Masking ID</co: 0:[0]>
- `<co>recipient</co: 0:[0]>` <co>(string, required): Single phone number only (01XXXXXXXXX or 8801XXXXXXXXX)</co: 0:[0]>
- `<co>message</co: 0:[0]>` <co>(string, required): SMS content to send</co: 0:[0]>

**Example Request:**
```json
{
  "client_id": "client_01KTC",
  "key": "mY3sRbC5XTEuL1veXo0N",
  "sender_id": "MyBrand",
  "recipient": "01339889071",
  "message": "Hello, World!"
}
```

**Success Response:**
```json
{
  "response_code": <co>200</co: 0:[0]>, 
  "message": <co>"SMS resent successfully."</co: 0:[0]>
}
```

### <co>3. Check SMS Balance</co: 0:[0]>

**<co>POST</co: 0:[0]>** `<co>/get-balance</co: 0:[0]>`

**Parameters:**
- `<co>client_id</co: 0:[0]>` <co>(string, required): Your unique client identifier</co: 0:[0]>

**Example Request:**
```json
{
  "client_id": "client_01KTC"
}
```

**Success Response:**
```json
{
  "response_code": <co>200</co: 0:[0]>, 
  "balance": <co>100.00</co: 0:[0]>, 
  "status": <co>"Active"</co: 0:[0]>
}
```

## Error Responses

| <co>Code</co: 0:[0]> | <co>Error</co: 0:[0]> | <co>Message</co: 0:[0]> | <co>Severity</co: 0:[0]> |
|------|-------|---------|----------|
| <co>1001</co: 0:[0]> | <co>Invalid Recipient</co: 0:[0]> | <co>Invalid recipient number. Supported formats: 01XXXXXXXXX or 8801XXXXXXXXX.</co: 0:[0]> | <co>Error</co: 0:[0]> |
| <co>2001</co: 0:[0]> | <co>Client ID Not Found</co: 0:[0]> | <co>Client ID not found.</co: 0:[0]> | <co>Error</co: 0:[0]> |
| <co>2002</co: 0:[0]> | <co>Account Inactive</co: 0:[0]> | <co>Your account is inactive. Please contact admin.</co: 0:[0]> | <co>Warning</co: 0:[0]> |
| <co>2003</co: 0:[0]> | <co>Insufficient Balance</co: 0:[0]> | <co>Insufficient balance.</co: 0:[0]> | <co>Warning</co: 0:[0]> |
| <co>3002</co: 0:[0]> | <co>API Key Mismatch</co: 0:[0]> | <co>Invalid API key.</co: 0:[0]> | <co>Error</co: 0:[0]> |
| <co>4001</co: 0:[0]> | <co>No Active Gateway</co: 0:[0]> | <co>No active gateway available.</co: 0:[0]> | <co>Error</co: 0:[0]> |

## Service Methods

### NotificationService

The `NotificationService` class provides the following methods:

#### <co>sendSms(phone, message, senderId?, isSmartResend?)</co: 7:[0]>

Sends an SMS message to the specified phone number.

**Parameters:**
- `<co>phone</co: 7:[0]>` <co>(string): Recipient phone number</co: 7:[0]>
- `<co>message</co: 7:[0]>` <co>(string): SMS message content</co: 7:[0]>
- `<co>senderId</co: 7:[0]>` <co>(string, optional): Sender ID for the SMS</co: 7:[0]>
- `<co>isSmartResend</co: 7:[0]>` <co>(boolean, optional): Whether to use smart resend (failover) - defaults to false</co: 7:[0]>

**Returns:** Promise<SmsResponse>

#### <co>sendEmail(email, subject, body)</co: 7:[0]>

Sends an email (currently a mock implementation).

**Parameters:**
- `<co>email</co: 7:[0]>` <co>(string): Recipient email address</co: 7:[0]>
- `<co>subject</co: 7:[0]>` <co>(string): Email subject</co: 7:[0]>
- `<co>body</co: 7:[0]>` <co>(string): Email body content</co: 7:[0]>

**Returns:** void (mock)

#### <co>checkSmsBalance()</co: 7:[0]>

Checks the current SMS balance.

**Returns:** Promise<SmsResponse>

## Usage Examples

### Basic SMS Sending

```typescript
import { notificationService } from '@/shared/services/notification.js';

await notificationService.sendSms('+1234567890', 'Hello, world!');
```

### SMS with Sender ID

```typescript
await notificationService.sendSms(
    '+1234567890', 
    'Your verification code: 123456',
    'MyBrand'
);
```

### Smart Resend (for OTP)

```typescript
await notificationService.sendSms(
    '+1234567890',
    'Your new OTP: 654321',
    'MyBrand',
    true // Use smart resend for failover
);
```

### Check Balance

```typescript
const balance = await notificationService.checkSmsBalance();
console.log(`Available balance: ${balance.balance}`);
```

## Testing

### Mock Mode

When the SMS service is not configured (missing client ID or API key), the service will operate in mock mode:

- SMS sending: Logs to console instead of sending
- Balance check: Returns mock balance of 100.00

### Error Handling

The service handles the following errors:
- Network errors
- API response errors
- Invalid responses

All errors are caught and logged, with the service returning appropriate error responses.

## Integration with Existing Code

The SMS service is integrated with the existing notification system. To use SMS functionality:

1. Configure the environment variables
2. Use the `notificationService.sendSms()` method
3. Handle the returned `SmsResponse` object

## Security Considerations

- Store API keys securely in environment variables
- Validate phone numbers before sending
- Implement rate limiting for SMS sending
- Monitor SMS balance to avoid service interruption
- Use smart resend for critical OTP messages

## Troubleshooting

### Service Not Configured

If the SMS service is not sending messages:

1. Verify environment variables are set
2. Check that `SMS_CLIENT_ID` and `SMS_API_KEY` are configured
3. Ensure the API keys are valid and active

### API Errors

If you receive API errors:

1. Check the error code and message
2. Verify the client ID and API key
3. Ensure the account is active and has sufficient balance
4. Check the phone number format

### Network Issues

If there are network connectivity issues:

1. Verify internet connectivity
2. Check firewall settings
3. Ensure the API endpoint is accessible
4. Consider implementing retry logic for failed requests