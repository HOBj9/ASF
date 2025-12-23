"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Code, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import toast from "react-hot-toast"

export function ApiUsageExamples() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopy = (code: string, lang: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(lang)
    toast.success("تم نسخ الكود")
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const curlExample = `curl -X POST https://your-domain.com/api/v1/send-message \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "user@example.com",
    "password": "yourpassword",
    "phoneNumber": "+1234567890",
    "message": "Hello from API!"
  }'`

  const javascriptExample = `async function sendMessage(apiKey, username, password, phoneNumber, message) {
  const response = await fetch('https://your-domain.com/api/v1/send-message', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: username,
      password: password,
      phoneNumber: phoneNumber,
      message: message,
    }),
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('Message sent:', data.data);
    return data.data;
  } else {
    console.error('Error:', data.error);
    throw new Error(data.error);
  }
}

// Usage
sendMessage(
  'YOUR_API_KEY_HERE',
  'user@example.com',
  'yourpassword',
  '+1234567890',
  'Hello from JavaScript!'
);`

  const pythonExample = `import requests

def send_message(api_key, username, password, phone_number, message):
    url = 'https://your-domain.com/api/v1/send-message'
    headers = {
        'X-API-Key': api_key,
        'Content-Type': 'application/json',
    }
    data = {
        'username': username,
        'password': password,
        'phoneNumber': phone_number,
        'message': message,
    }
    
    response = requests.post(url, json=data, headers=headers)
    result = response.json()
    
    if result.get('success'):
        print('Message sent:', result.get('data'))
        return result.get('data')
    else:
        print('Error:', result.get('error'))
        raise Exception(result.get('error'))

# Usage
send_message(
    'YOUR_API_KEY_HERE',
    'user@example.com',
    'yourpassword',
    '+1234567890',
    'Hello from Python!'
)`

  const phpExample = `<?php
function sendMessage($apiKey, $username, $password, $phoneNumber, $message) {
    $url = 'https://your-domain.com/api/v1/send-message';
    
    $data = [
        'username' => $username,
        'password' => $password,
        'phoneNumber' => $phoneNumber,
        'message' => $message,
    ];
    
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => [
                'X-API-Key: ' . $apiKey,
                'Content-Type: application/json',
            ],
            'content' => json_encode($data),
        ],
    ];
    
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);
    $result = json_decode($response, true);
    
    if ($result['success']) {
        echo 'Message sent: ' . json_encode($result['data']);
        return $result['data'];
    } else {
        echo 'Error: ' . $result['error'];
        throw new Exception($result['error']);
    }
}

// Usage
sendMessage(
    'YOUR_API_KEY_HERE',
    'user@example.com',
    'yourpassword',
    '+1234567890',
    'Hello from PHP!'
);
?>`

  const verificationCurlExample = `curl -X POST https://your-domain.com/api/v1/verification/send \\
  -H "X-API-Key: YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phoneNumber": "+1234567890",
    "code": "1234"
  }'`

  const verificationJavascriptExample = `async function sendVerificationCode(apiKey, phoneNumber, code) {
  const response = await fetch('https://your-domain.com/api/v1/verification/send', {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phoneNumber: phoneNumber,
      code: code,
    }),
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('Verification code queued:', data.data);
    return data.data;
  } else {
    console.error('Error:', data.error);
    throw new Error(data.error);
  }
}

// Usage
sendVerificationCode(
  'YOUR_API_KEY_HERE',
  '+1234567890',
  '1234'
);`

  const verificationPythonExample = `import requests

def send_verification_code(api_key, phone_number, code):
    url = 'https://your-domain.com/api/v1/verification/send'
    headers = {
        'X-API-Key': api_key,
        'Content-Type': 'application/json',
    }
    data = {
        'phoneNumber': phone_number,
        'code': code,
    }
    
    response = requests.post(url, json=data, headers=headers)
    result = response.json()
    
    if result.get('success'):
        print('Verification code queued:', result.get('data'))
        return result.get('data')
    else:
        print('Error:', result.get('error'))
        raise Exception(result.get('error'))

# Usage
send_verification_code(
    'YOUR_API_KEY_HERE',
    '+1234567890',
    '1234'
)`

  return (
    <div className="space-y-6">
      <Card className="text-right">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            إرسال الرسائل العادية
          </CardTitle>
          <CardDescription>
            أمثلة على كيفية استخدام API لإرسال الرسائل من أنظمة خارجية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Endpoint</h4>
            <code className="text-sm bg-background px-2 py-1 rounded block">
              POST /api/v1/send-message
            </code>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Headers المطلوبة</h4>
            <code className="text-sm bg-background px-2 py-1 rounded block">
              X-API-Key: YOUR_API_KEY_HERE
            </code>
            <code className="text-sm bg-background px-2 py-1 rounded block">
              Content-Type: application/json
            </code>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Request Body</h4>
            <pre className="text-sm bg-background p-3 rounded overflow-x-auto">
              <code>{`{
  "username": "user@example.com",
  "password": "yourpassword",
  "phoneNumber": "+1234567890",
  "message": "Your message text"
}`}</code>
            </pre>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Response (Success)</h4>
            <pre className="text-sm bg-background p-3 rounded overflow-x-auto">
              <code>{`{
  "success": true,
  "data": {
    "success": true,
    "messageId": "message-id",
    "phoneNumber": "+1234567890",
    "sentAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "تم إرسال الرسالة بنجاح"
}`}</code>
            </pre>
          </div>

          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="mt-4">
              <div className="relative group">
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
                  <code className="text-slate-100">{curlExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
                  onClick={() => handleCopy(curlExample, 'curl')}
                >
                  <Copy className={`h-4 w-4 ${copiedCode === 'curl' ? 'text-green-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="javascript" className="mt-4">
              <div className="relative group">
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
                  <code className="text-slate-100 language-javascript">{javascriptExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
                  onClick={() => handleCopy(javascriptExample, 'javascript')}
                >
                  <Copy className={`h-4 w-4 ${copiedCode === 'javascript' ? 'text-green-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="python" className="mt-4">
              <div className="relative group">
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
                  <code className="text-slate-100 language-python">{pythonExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
                  onClick={() => handleCopy(pythonExample, 'python')}
                >
                  <Copy className={`h-4 w-4 ${copiedCode === 'python' ? 'text-green-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="php" className="mt-4">
              <div className="relative group">
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
                  <code className="text-slate-100 language-php">{phpExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
                  onClick={() => handleCopy(phpExample, 'php')}
                >
                  <Copy className={`h-4 w-4 ${copiedCode === 'php' ? 'text-green-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">ملاحظات مهمة</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>يجب أن يكون API key صحيحاً ويتبع لنفس المستخدم المدخل في username</li>
              <li>يجب أن يكون username هو البريد الإلكتروني للمستخدم</li>
              <li>phoneNumber يجب أن يكون بالصيغة الدولية (مثال: +963956829831)</li>
              <li>message يجب أن يكون نص الرسالة (الحد الأقصى: 4096 حرف)</li>
              <li>يجب أن تكون هناك جلسة نشطة (ready أو online) لإرسال الرسائل</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card className="text-right">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          إرسال رموز التحقق
        </CardTitle>
        <CardDescription>
          أمثلة على كيفية استخدام API لإرسال رموز التحقق مع رسائل ترحيبية ديناميكية
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Endpoint</h4>
            <code className="text-sm bg-background px-2 py-1 rounded block">
              POST /api/v1/verification/send
            </code>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Headers المطلوبة</h4>
            <code className="text-sm bg-background px-2 py-1 rounded block">
              X-API-Key: YOUR_API_KEY_HERE
            </code>
            <code className="text-sm bg-background px-2 py-1 rounded block">
              Content-Type: application/json
            </code>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Request Body</h4>
            <pre className="text-sm bg-background p-3 rounded overflow-x-auto">
              <code>{`{
  "phoneNumber": "+1234567890",
  "code": "1234"
}`}</code>
            </pre>
          </div>

          <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
            <h4 className="font-semibold">Response (Success)</h4>
            <pre className="text-sm bg-background p-3 rounded overflow-x-auto">
              <code>{`{
  "success": true,
  "data": {
    "success": true,
    "verificationCodeId": "code-id",
    "phoneNumber": "+1234567890",
    "status": "sent",
    "message": "تمت إضافة رسائل التحقق إلى قائمة الانتظار"
  },
  "message": "تمت إضافة رسائل التحقق إلى قائمة الانتظار بنجاح"
}`}</code>
            </pre>
          </div>

          <Tabs defaultValue="curl" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="mt-4">
              <div className="relative group">
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
                  <code className="text-slate-100">{verificationCurlExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
                  onClick={() => handleCopy(verificationCurlExample, 'verification-curl')}
                >
                  <Copy className={`h-4 w-4 ${copiedCode === 'verification-curl' ? 'text-green-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="javascript" className="mt-4">
              <div className="relative group">
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
                  <code className="text-slate-100 language-javascript">{verificationJavascriptExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
                  onClick={() => handleCopy(verificationJavascriptExample, 'verification-javascript')}
                >
                  <Copy className={`h-4 w-4 ${copiedCode === 'verification-javascript' ? 'text-green-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="python" className="mt-4">
              <div className="relative group">
                <pre className="text-sm bg-slate-900 dark:bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto font-mono whitespace-pre">
                  <code className="text-slate-100 language-python">{verificationPythonExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 left-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200"
                  onClick={() => handleCopy(verificationPythonExample, 'verification-python')}
                >
                  <Copy className={`h-4 w-4 ${copiedCode === 'verification-python' ? 'text-green-400' : ''}`} />
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 p-4 space-y-2">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">ملاحظات مهمة - رموز التحقق</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              <li>يتم إرسال رسالة ترحيبية أولاً (عشوائية من العبارات الترحيبية المفعّلة)</li>
              <li>ثم يتم إرسال رسالة التحقق (عشوائية من القوالب المفعّلة مع استبدال placeholders)</li>
              <li>Placeholders المدعومة: {`{code}`} (رمز التحقق), {`{brandName}`} (اسم العمل من الملف الشخصي), {`{greeting}`} (العبارة الترحيبية)</li>
              <li>مدة 60 ثانية بين كل رسالة تحقق ورسالة تحقق أخرى لكل مستخدم</li>
              <li>phoneNumber يجب أن يكون بالصيغة الدولية (مثال: +963956829831)</li>
              <li>code هو رمز التحقق الذي تريد إرساله (يمكن أن يكون أي نص)</li>
              <li>يجب أن تكون هناك جلسة نشطة (ready أو online) لإرسال الرسائل</li>
              <li>يجب إضافة اسم العمل في الملف الشخصي ليتم استخدامه في الرسائل</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}

