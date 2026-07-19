"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, ExternalLink } from "lucide-react";
import type { CertificateData } from "@/lib/certificate-generator";
import { generateCertificateHTML } from "@/lib/certificate-generator";
import { useState } from "react";

interface CertificateDisplayProps {
  certificates: CertificateData[];
}

export function CertificateDisplay({ certificates }: CertificateDisplayProps) {
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [previewHTML, setPreviewHTML] = useState<string>("");

  const handlePreview = (cert: CertificateData) => {
    setPreviewHTML(generateCertificateHTML(cert));
    setPreviewId(certificates.indexOf(cert));
  };

  const handleDownload = (cert: CertificateData) => {
    const html = generateCertificateHTML(cert);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${cert.certificateType}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCertificateColor = (type: CertificateData["certificateType"]) => {
    switch (type) {
      case "level":
        return "border-yellow-500 bg-yellow-500/5";
      case "achievement":
        return "border-green-500 bg-green-500/5";
      case "progress":
        return "border-blue-500 bg-blue-500/5";
      case "milestone":
        return "border-purple-500 bg-purple-500/5";
    }
  };

  const getCertificateIcon = (type: CertificateData["certificateType"]) => {
    switch (type) {
      case "level":
        return "🏆";
      case "achievement":
        return "⭐";
      case "progress":
        return "📈";
      case "milestone":
        return "🎉";
    }
  };

  if (certificates.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Award className="size-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No tienes certificados aún. ¡Completa entrenamientos para desbloquearlos!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {certificates.map((cert, idx) => (
          <Card key={idx} className={`border-2 ${getCertificateColor(cert.certificateType)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-2xl mb-1">{getCertificateIcon(cert.certificateType)}</p>
                  <CardTitle className="text-base line-clamp-2">{cert.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{cert.userName}</p>
                </div>
                <p className="text-xs text-muted-foreground whitespace-nowrap">{cert.date}</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {cert.description}
              </p>

              {cert.stats.length > 0 && (
                <div className="space-y-2">
                  {cert.stats.slice(0, 2).map((stat, sIdx) => (
                    <div
                      key={sIdx}
                      className="flex items-center justify-between text-sm p-2 bg-secondary/50 rounded"
                    >
                      <span className="text-muted-foreground">{stat.metric}</span>
                      <span className="font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handlePreview(cert)}
                >
                  <ExternalLink className="size-3 mr-1" />
                  Ver
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleDownload(cert)}
                >
                  <Download className="size-3 mr-1" />
                  Descargar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {previewId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Vista Previa de Certificado</CardTitle>
              <button
                onClick={() => setPreviewId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </CardHeader>
            <CardContent>
              <div
                dangerouslySetInnerHTML={{ __html: previewHTML }}
                className="bg-white rounded"
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
