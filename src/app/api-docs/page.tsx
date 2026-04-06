import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "API Docs",
  description: "Mobile API reference",
};

const specUrl = "/api/openapi/mobile";
const swaggerPageStyles = `
  html,
  body {
    background: #ffffff;
  }

  #swagger-ui,
  #swagger-ui * {
    direction: ltr;
  }

  #swagger-ui {
    color: #0f172a;
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

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white" dir="ltr">
      <div id="swagger-ui" className="min-h-screen" />

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
            url: '${specUrl}',
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
