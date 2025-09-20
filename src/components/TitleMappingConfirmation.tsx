'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TitleMapping {
  csvTitle: string
  suggestedMatch?: string
  confidence?: number
}

interface TitleMappingConfirmationProps {
  mappings: TitleMapping[]
  onConfirm: (confirmedMappings: Record<string, string>) => void
  onCancel: () => void
}

export function TitleMappingConfirmation({ mappings, onConfirm, onCancel }: TitleMappingConfirmationProps) {
  const [confirmedMappings, setConfirmedMappings] = useState<Record<string, string>>({})

  const handleConfirmMapping = (csvTitle: string, dbTitle: string) => {
    setConfirmedMappings(prev => ({
      ...prev,
      [csvTitle]: dbTitle
    }))
  }

  const handleSubmit = () => {
    onConfirm(confirmedMappings)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader>
          <CardTitle>Confirm Film Title Mappings</CardTitle>
          <p className="text-sm text-muted-foreground">
            We found some film titles in your CSV that don't exactly match titles in the database.
            Please confirm the correct mappings:
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {mappings.map((mapping) => (
            <div key={mapping.csvTitle} className="border rounded-lg p-4 space-y-2">
              <div>
                <span className="font-medium">CSV Title: </span>
                <Badge variant="outline">{mapping.csvTitle}</Badge>
              </div>

              {mapping.suggestedMatch ? (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Suggested match: </span>
                    <Badge variant="secondary">{mapping.suggestedMatch}</Badge>
                    {mapping.confidence && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({Math.round(mapping.confidence * 100)}% confidence)
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={confirmedMappings[mapping.csvTitle] === mapping.suggestedMatch ? "default" : "outline"}
                      onClick={() => handleConfirmMapping(mapping.csvTitle, mapping.suggestedMatch!)}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant={confirmedMappings[mapping.csvTitle] === mapping.csvTitle ? "default" : "outline"}
                      onClick={() => handleConfirmMapping(mapping.csvTitle, mapping.csvTitle)}
                    >
                      Keep as-is
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">No close match found</div>
                  <Button
                    size="sm"
                    variant={confirmedMappings[mapping.csvTitle] === mapping.csvTitle ? "default" : "outline"}
                    onClick={() => handleConfirmMapping(mapping.csvTitle, mapping.csvTitle)}
                  >
                    Keep as-is
                  </Button>
                </div>
              )}
            </div>
          ))}

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSubmit} disabled={mappings.length > Object.keys(confirmedMappings).length}>
              Confirm All Mappings
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}