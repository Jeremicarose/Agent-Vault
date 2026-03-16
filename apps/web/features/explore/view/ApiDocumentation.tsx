import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { VariableDefinition } from '@/features/proxy/model/variables'
import { generateIntegrationExample } from '../model/utils'

interface ApiDocumentationProps {
  proxyUrl: string
  httpMethod: string
  variablesSchema: VariableDefinition[]
  requestBodyTemplate: string | null
  queryParamsTemplate: string | null
  exampleResponse: string | null
}

/**
 * Variables table component for displaying API variable schema
 */
function VariablesTable({ variables }: { variables: VariableDefinition[] }) {
  if (variables.length === 0) return null

  return (
    <div>
      <h3 className="font-semibold mb-3">Variables</h3>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Required</th>
              <th className="text-left p-3 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {variables.map((v) => (
              <tr key={v.name} className="border-t">
                <td className="p-3 font-mono">{v.name}</td>
                <td className="p-3">
                  <Badge variant="outline">{v.type}</Badge>
                </td>
                <td className="p-3">
                  {v.required ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <span className="text-muted-foreground">No</span>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">
                  {v.description || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Code block component for displaying templates and examples
 */
function CodeBlock({
  title,
  content,
  maxHeight,
}: {
  title: string
  content: string
  maxHeight?: string
}) {
  return (
    <div>
      <h3 className="font-semibold mb-3">{title}</h3>
      <pre
        className={`p-4 rounded-lg bg-muted overflow-x-auto ${maxHeight || ''}`}
      >
        <code className="text-sm font-mono">{content}</code>
      </pre>
    </div>
  )
}

/**
 * API Documentation card component - displays variables, templates, and integration examples
 */
export function ApiDocumentation({
  proxyUrl,
  httpMethod,
  variablesSchema,
  requestBodyTemplate,
  queryParamsTemplate,
  exampleResponse,
}: ApiDocumentationProps) {
  const integrationExample = generateIntegrationExample(proxyUrl, httpMethod)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentation</CardTitle>
        <CardDescription>
          Learn how to integrate this API into your application
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Variables Schema */}
        <VariablesTable variables={variablesSchema} />

        {/* Request Body Template */}
        {requestBodyTemplate && (
          <CodeBlock title="Request Body Template" content={requestBodyTemplate} />
        )}

        {/* Query Params Template */}
        {queryParamsTemplate && (
          <CodeBlock title="Query Parameters" content={queryParamsTemplate} />
        )}

        {/* Example Response */}
        {exampleResponse && (
          <CodeBlock
            title="Example Response"
            content={exampleResponse}
            maxHeight="max-h-[300px]"
          />
        )}

        {/* Usage example */}
        <CodeBlock title="Integration Example" content={integrationExample} />
      </CardContent>
    </Card>
  )
}
