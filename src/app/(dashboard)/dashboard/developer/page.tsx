'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Code2, Copy, ExternalLink, Book, Terminal, Key, Plus, CheckCircle,
  Upload, List, Link2, FolderOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400',
  POST: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400',
  PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400',
  PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400',
};

const endpoints = [
  { method: 'POST', path: '/api/files/upload', desc: 'Upload a file (with optional folderId)' },
  { method: 'POST', path: '/api/files/chunk/init', desc: 'Initialize chunked upload (files > 50 MB)' },
  { method: 'POST', path: '/api/files/chunk/upload', desc: 'Upload a chunk' },
  { method: 'POST', path: '/api/files/chunk/complete', desc: 'Finalize chunked upload' },
  { method: 'GET', path: '/api/files', desc: 'List files (supports folderId, page, limit, sortBy)' },
  { method: 'GET', path: '/api/files/:id', desc: 'Get file metadata' },
  { method: 'GET', path: '/api/files/:id/download', desc: 'Download file (authenticated)' },
  { method: 'GET', path: '/api/files/:id/thumbnail', desc: 'Get image thumbnail' },
  { method: 'DELETE', path: '/api/files/:id', desc: 'Move file to trash' },
  { method: 'DELETE', path: '/api/files/:id/permanent', desc: 'Permanently delete file' },
  { method: 'PATCH', path: '/api/files/:id/restore', desc: 'Restore file from trash' },
  { method: 'POST', path: '/api/folders', desc: 'Create folder (with optional parentId)' },
  { method: 'GET', path: '/api/folders', desc: 'List folders (root=true or parentId=...)' },
  { method: 'GET', path: '/api/folders/tree', desc: 'Get full folder tree' },
  { method: 'POST', path: '/api/shares', desc: 'Create a share link' },
  { method: 'GET', path: '/api/shares/:token/view/:filename', desc: 'View file inline â€” use in <img>, <video>, <iframe>' },
  { method: 'GET', path: '/api/shares/:token/download', desc: 'Force-download a shared file' },
  { method: 'GET', path: '/api/shares/:token/access', desc: 'Get share metadata (public)' },
  { method: 'GET', path: '/api/search?q=query', desc: 'Search files and folders' },
  { method: 'GET', path: '/api/storage/me', desc: 'Your storage usage and quota' },
  { method: 'GET', path: '/api/system/health', desc: 'System health check' },
];

function buildExamples(apiKey: string, base: string) {
  const k = apiKey || 'YOUR_API_KEY';

  return {
    curl: {
      label: 'cURL',
      upload: `# Upload a file
curl -X POST ${base}/api/files/upload \\
  -H "X-API-Key: ${k}" \\
  -F "file=@/path/to/photo.png"

# Upload into a specific folder
curl -X POST ${base}/api/files/upload \\
  -H "X-API-Key: ${k}" \\
  -F "file=@/path/to/photo.png" \\
  -F "folderId=FOLDER_ID"`,

      list: `# List files
curl "${base}/api/files?page=1&limit=20" \\
  -H "X-API-Key: ${k}"

# List files inside a folder
curl "${base}/api/files?folderId=FOLDER_ID" \\
  -H "X-API-Key: ${k}"`,

      share: `# Create a public share link
curl -X POST ${base}/api/shares \\
  -H "X-API-Key: ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{"fileId":"FILE_ID"}'

# Response contains token â€” then use:
# ${base}/api/shares/TOKEN/view/photo.png`,

      folder: `# Create a folder
curl -X POST ${base}/api/folders \\
  -H "X-API-Key: ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Folder"}'

# Create a subfolder
curl -X POST ${base}/api/folders \\
  -H "X-API-Key: ${k}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Subfolder","parentId":"PARENT_FOLDER_ID"}'`,
    },

    js: {
      label: 'JavaScript',
      upload: `// Upload a file from a file input or Blob
const form = new FormData();
form.append('file', fileInput.files[0]);
// form.append('folderId', 'FOLDER_ID'); // optional

const res = await fetch('${base}/api/files/upload', {
  method: 'POST',
  headers: { 'X-API-Key': '${k}' },
  body: form,
});
const file = await res.json();
console.log('File ID:', file.id);

// Direct view URL (works in <img src="...">)
const viewUrl = \`${base}/api/shares/\${shareToken}/view/\${file.originalName}\`;`,

      list: `// List all files
const res = await fetch('${base}/api/files?page=1&limit=20', {
  headers: { 'X-API-Key': '${k}' },
});
const { data, meta } = await res.json();
console.log(\`\${meta.total} files, page \${meta.page}/\${meta.totalPages}\`);

// List files in a specific folder
const folderRes = await fetch('${base}/api/files?folderId=FOLDER_ID', {
  headers: { 'X-API-Key': '${k}' },
});`,

      share: `// Upload then immediately get a public view URL
const form = new FormData();
form.append('file', imageFile);
const uploadRes = await fetch('${base}/api/files/upload', {
  method: 'POST',
  headers: { 'X-API-Key': '${k}' },
  body: form,
});
const { id, originalName } = await uploadRes.json();

// Create a public share link
const shareRes = await fetch('${base}/api/shares', {
  method: 'POST',
  headers: { 'X-API-Key': '${k}', 'Content-Type': 'application/json' },
  body: JSON.stringify({ fileId: id }),
});
const { token } = await shareRes.json();

// Use this URL anywhere â€” in <img>, CSS, Notion, etc.
const viewUrl = \`${base}/api/shares/\${token}/view/\${originalName}\`;
console.log(viewUrl);`,

      folder: `// Create a folder
const res = await fetch('${base}/api/folders', {
  method: 'POST',
  headers: { 'X-API-Key': '${k}', 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'My Folder' }),
});
const folder = await res.json();

// Upload into that folder
const form = new FormData();
form.append('file', file);
form.append('folderId', folder.id);
await fetch('${base}/api/files/upload', {
  method: 'POST',
  headers: { 'X-API-Key': '${k}' },
  body: form,
});`,
    },

    python: {
      label: 'Python',
      upload: `import requests

API_KEY = "${k}"
BASE = "${base}/api"

# Upload a file
with open('/path/to/photo.png', 'rb') as f:
    res = requests.post(
        f'{BASE}/files/upload',
        headers={'X-API-Key': API_KEY},
        files={'file': f},
        # data={'folderId': 'FOLDER_ID'}  # optional
    )
file = res.json()
print('File ID:', file['id'])`,

      list: `import requests

API_KEY = "${k}"
BASE = "${base}/api"

# List files
res = requests.get(
    f'{BASE}/files',
    headers={'X-API-Key': API_KEY},
    params={'page': 1, 'limit': 20}
)
data = res.json()
print(f"Found {data['meta']['total']} files")`,

      share: `import requests

API_KEY = "${k}"
BASE = "${base}/api"

# Upload file
with open('/path/to/image.png', 'rb') as f:
    upload = requests.post(
        f'{BASE}/files/upload',
        headers={'X-API-Key': API_KEY},
        files={'file': f}
    ).json()

# Create public share
share = requests.post(
    f'{BASE}/shares',
    headers={'X-API-Key': API_KEY},
    json={'fileId': upload['id']}
).json()

# Direct embeddable URL
view_url = f"{BASE}/shares/{share['token']}/view/{upload['originalName']}"
print(view_url)
# â†’ use in <img src="...">, CSS, anywhere`,

      folder: `import requests

API_KEY = "${k}"
BASE = "${base}/api"

# Create a folder
folder = requests.post(
    f'{BASE}/folders',
    headers={'X-API-Key': API_KEY},
    json={'name': 'My Folder'}
).json()

# Upload into that folder
with open('/path/to/file.pdf', 'rb') as f:
    requests.post(
        f'{BASE}/files/upload',
        headers={'X-API-Key': API_KEY},
        files={'file': f},
        data={'folderId': folder['id']}
    )`,
    },
  };
}

type ExampleKey = 'upload' | 'list' | 'share' | 'folder';
type LangKey = 'curl' | 'js' | 'python';

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="bg-zinc-950 dark:bg-zinc-900 text-zinc-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-72 leading-relaxed border border-zinc-800">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition opacity-0 group-hover:opacity-100"
      >
        {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function DeveloperPage() {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [lang, setLang] = useState<LangKey>('js');
  const [example, setExample] = useState<ExampleKey>('upload');
  const [showEndpoints, setShowEndpoints] = useState(true);

  const { data: keysData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get('/api-keys').then((r) => r.data),
  });

  const keys = (keysData?.data || []).filter((k: any) => k.status === 'ACTIVE');
  const examples = buildExamples(selectedKey, API_URL);
  const langs: { key: LangKey; label: string }[] = [
    { key: 'curl', label: 'cURL' },
    { key: 'js', label: 'JavaScript' },
    { key: 'python', label: 'Python' },
  ];
  const exampleTabs: { key: ExampleKey; label: string; icon: any }[] = [
    { key: 'upload', label: 'Upload file', icon: Upload },
    { key: 'list', label: 'List files', icon: List },
    { key: 'share', label: 'Upload + embed URL', icon: Link2 },
    { key: 'folder', label: 'Folders', icon: FolderOpen },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Developer Portal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">API reference and ready-to-run code examples</p>
        </div>
        <a
          href={`${API_URL}/api/docs`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition"
        >
          <Book className="w-4 h-4" /> Swagger Docs <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Step 1 â€” pick your API key */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">1</div>
          <h2 className="font-semibold">Select your API key</h2>
        </div>
        <p className="text-sm text-muted-foreground ml-7 mb-3">
          All examples below will use this key â€” copy-paste ready.
        </p>

        {keys.length === 0 ? (
          <div className="ml-7 flex items-center gap-3">
            <p className="text-sm text-muted-foreground">No active API keys.</p>
            <Link
              href="/dashboard/api-keys"
              className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Create one
            </Link>
          </div>
        ) : (
          <div className="ml-7 flex flex-wrap gap-2">
            {keys.map((k: any) => (
              <button
                key={k.id}
                onClick={() => setSelectedKey(k.keyPrefix + '_REPLACE_WITH_FULL_KEY')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition',
                  selectedKey.startsWith(k.keyPrefix)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:bg-muted',
                )}
              >
                <Key className="w-3.5 h-3.5" />
                {k.name}
                <code className="font-mono text-xs opacity-60">{k.keyPrefix}â€¢â€¢â€¢â€¢</code>
              </button>
            ))}
            <Link
              href="/dashboard/api-keys"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <Plus className="w-3.5 h-3.5" /> New key
            </Link>
          </div>
        )}

        {/* Manual key entry */}
        <div className="ml-7 mt-3">
          <input
            type="text"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            placeholder="Paste your full API key here"
            className="w-full max-w-md px-3 py-2 rounded-lg bg-background border border-input text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring transition"
          />
          <p className="text-xs text-muted-foreground mt-1">The full key is only shown once when created â€” paste it from your saved copy.</p>
        </div>
      </div>

      {/* Step 2 â€” send the key */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">2</div>
          <h2 className="font-semibold">Send the key with every request</h2>
        </div>
        <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Header (recommended)</p>
            <code className="text-sm font-mono">X-API-Key: {selectedKey || 'YOUR_API_KEY'}</code>
          </div>
          <div className="bg-muted/50 rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Base URL</p>
            <code className="text-sm font-mono">{API_URL}/api</code>
          </div>
        </div>
      </div>

      {/* Step 3 â€” code examples */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">3</div>
          <h2 className="font-semibold">Code examples</h2>
        </div>

        {/* Language tabs */}
        <div className="ml-7 flex gap-1 mb-4">
          {langs.map((l) => (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition',
                lang === l.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Example selector */}
        <div className="ml-7 flex flex-wrap gap-2 mb-4">
          {exampleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setExample(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition',
                example === tab.key
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="ml-7">
          <CodeBlock code={examples[lang][example]} />
        </div>
      </div>

      {/* Embed URL pattern */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold mb-1">Cloudinary-style embed URLs</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Upload a file â†’ create a share â†’ use the URL directly in any app, CMS, or HTML.
        </p>
        <div className="space-y-2">
          {[
            { label: 'Image embed', code: `<img src="${API_URL}/api/shares/TOKEN/view/photo.png" />` },
            { label: 'Video embed', code: `<video src="${API_URL}/api/shares/TOKEN/view/clip.mp4" controls></video>` },
            { label: 'PDF embed', code: `<iframe src="${API_URL}/api/shares/TOKEN/view/doc.pdf" width="100%" height="600px"></iframe>` },
            { label: 'CSS background', code: `background-image: url(${API_URL}/api/shares/TOKEN/view/banner.jpg);` },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <CodeBlock code={item.code} />
            </div>
          ))}
        </div>
      </div>

      {/* Endpoint reference */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowEndpoints(!showEndpoints)}
          className="w-full flex items-center justify-between p-5 hover:bg-muted/30 transition"
        >
          <h2 className="font-semibold">API Endpoint Reference</h2>
          {showEndpoints ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showEndpoints && (
          <table className="w-full border-t border-border">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase w-20">Method</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase">Path</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">Description</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map((ep, i) => (
                <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono', METHOD_COLORS[ep.method])}>
                      {ep.method}
                    </span>
                  </td>
                  <td className="p-3">
                    <code className="text-xs font-mono">{ep.path}</code>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

