import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";

type ApiDocsPageProps = {
  searchParams?: Promise<{
    spec?: string;
  }>;
};

const specOptions = {
  mobile: {
    label: "Mobile",
    description: "توثيق دخول مشرف الخط، الاستبيانات، التصنيفات، وتتبع الموبايل.",
    url: "/api/openapi/mobile",
  },
  tracking: {
    label: "Tracking",
    description: "توثيق التتبع الحي، المراقبة، الربط، وإدارة تدفق بيانات GPS.",
    url: "/api/openapi/tracking",
  },
  surveys: {
    label: "Surveys & Classifications",
    description: "توثيق الاستبيانات الداخلية والتصنيفات الأساسية والفرعية وتحويل الردود.",
    url: "/api/openapi/surveys",
  },
} as const;

type SpecKey = keyof typeof specOptions;

export const metadata: Metadata = {
  title: "API Docs",
  description: "Unified API reference for mobile, tracking, surveys, and classifications",
};

const swaggerPageStyles = `
  html,
  body {
    background: #f8fafc;
  }

  body {
    margin: 0;
  }

  .api-docs-shell {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 28%),
      radial-gradient(circle at top right, rgba(16, 185, 129, 0.1), transparent 26%),
      #f8fafc;
    color: #0f172a;
  }

  .api-docs-header {
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 1px solid rgba(148, 163, 184, 0.24);
    background: rgba(248, 250, 252, 0.92);
    backdrop-filter: blur(14px);
  }

  .api-docs-header-inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 20px 24px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }

  .api-docs-title {
    max-width: 520px;
  }

  .api-docs-title h1 {
    margin: 0;
    font-size: 1.75rem;
    line-height: 1.1;
  }

  .api-docs-title p {
    margin: 8px 0 0;
    color: #475569;
    line-height: 1.6;
  }

  .api-docs-tabs {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 10px;
  }

  .api-docs-tab {
    display: inline-flex;
    min-width: 180px;
    flex-direction: column;
    gap: 4px;
    border-radius: 16px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: rgba(255, 255, 255, 0.86);
    padding: 12px 14px;
    text-decoration: none;
    color: inherit;
    transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
  }

  .api-docs-tab:hover {
    transform: translateY(-1px);
    border-color: rgba(14, 165, 233, 0.34);
    box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  }

  .api-docs-tab[data-active="true"] {
    border-color: rgba(14, 165, 233, 0.42);
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(255, 255, 255, 0.98));
    box-shadow: 0 16px 32px rgba(14, 165, 233, 0.14);
  }

  .api-docs-tab-title {
    font-size: 0.96rem;
    font-weight: 700;
  }

  .api-docs-tab-desc {
    font-size: 0.78rem;
    line-height: 1.5;
    color: #64748b;
  }

  .api-docs-swagger {
    max-width: 1240px;
    margin: 0 auto;
    padding: 24px;
  }

  #swagger-ui,
  #swagger-ui * {
    direction: ltr;
  }

  #swagger-ui {
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  }

  #swagger-ui .swagger-ui {
    font-family: Arial, Helvetica, sans-serif;
  }

  #swagger-ui .topbar {
    display: none;
  }

  #swagger-ui .scheme-container {
    box-shadow: none;
    padding: 20px 0;
  }

  #swagger-ui pre,
  #swagger-ui code,
  #swagger-ui textarea,
  #swagger-ui input,
  #swagger-ui select,
  #swagger-ui .microlight,
  #swagger-ui .highlight-code {
    direction: ltr !important;
    text-align: left !important;
    unicode-bidi: plaintext;
  }

  #swagger-ui textarea {
    min-height: 320px !important;
    font-family: Consolas, Monaco, "Courier New", monospace !important;
    line-height: 1.6 !important;
  }

  #swagger-ui .opblock-description-wrapper,
  #swagger-ui .opblock-external-docs-wrapper,
  #swagger-ui .opblock-title_normal,
  #swagger-ui .response-col_description,
  #swagger-ui .parameter__name,
  #swagger-ui .parameter__type,
  #swagger-ui .model-title,
  #swagger-ui .prop-type,
  #swagger-ui .prop-format,
  #swagger-ui .tab li,
  #swagger-ui .info p,
  #swagger-ui .info li,
  #swagger-ui .markdown p,
  #swagger-ui .markdown li {
    text-align: left !important;
  }
`;

function getSelectedSpecKey(value?: string): SpecKey {
  return value === "tracking" || value === "surveys" ? value : "mobile";
}

export default async function ApiDocsPage({ searchParams }: ApiDocsPageProps) {
  const params = (await searchParams) || {};
  const selectedSpec = getSelectedSpecKey(params.spec);
  const selectedConfig = specOptions[selectedSpec];

  return (
    <main className="api-docs-shell" dir="rtl">
      <div className="api-docs-header">
        <div className="api-docs-header-inner">
          <div className="api-docs-title">
            <h1>API Docs</h1>
            <p>{selectedConfig.description}</p>
          </div>

          <div className="api-docs-tabs">
            {(Object.entries(specOptions) as Array<[SpecKey, (typeof specOptions)[SpecKey]]>).map(
              ([key, option]) => (
                <Link
                  key={key}
                  href={`/api-docs?spec=${key}`}
                  className="api-docs-tab"
                  data-active={key === selectedSpec}
                >
                  <span className="api-docs-tab-title">{option.label}</span>
                  <span className="api-docs-tab-desc">{option.description}</span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>

      <div className="api-docs-swagger">
        <div id="swagger-ui" />
      </div>

      <Script
        id="swagger-ui-stylesheet"
        strategy="beforeInteractive"
      >{`(() => {
          const existing = document.querySelector('link[data-swagger-ui="true"]');
          if (existing) return;
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css';
          link.setAttribute('data-swagger-ui', 'true');
          document.head.appendChild(link);
        })();`}</Script>
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
      />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"
        strategy="afterInteractive"
      />
      <Script id="swagger-ui-init" strategy="afterInteractive">{`
        (function initSwagger() {
          if (!window.SwaggerUIBundle || !window.SwaggerUIStandalonePreset) {
            window.setTimeout(initSwagger, 50);
            return;
          }

          window.ui = window.SwaggerUIBundle({
            url: '${selectedConfig.url}',
            dom_id: '#swagger-ui',
            deepLinking: true,
            displayRequestDuration: true,
            docExpansion: 'list',
            defaultModelRendering: 'example',
            defaultModelsExpandDepth: -1,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true,
            persistAuthorization: true,
            syntaxHighlight: {
              activate: true,
              theme: 'agate'
            },
            presets: [
              window.SwaggerUIBundle.presets.apis,
              window.SwaggerUIStandalonePreset
            ],
            layout: 'BaseLayout'
          });
        })();
      `}</Script>
      <style dangerouslySetInnerHTML={{ __html: swaggerPageStyles }} />
    </main>
  );
}
