"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  runDiagnosticTest,
  type DiagnosticQuestions,
  type DiagnosticResult,
} from "@/lib/diagnostic-test";
import { CheckCircle, AlertCircle, Lightbulb, BarChart3 } from "lucide-react";

interface DiagnosticTestProps {
  onComplete?: (result: DiagnosticResult) => void;
}

const QUESTIONS = [
  {
    id: "readingHabits",
    label: "¿Cuánto lees actualmente?",
    options: ["Casi nunca", "1-2 horas/semana", "3-5 horas/semana", "Todos los días", "5+ horas/día"],
  },
  {
    id: "concentration",
    label: "¿Cuál es tu capacidad de concentración?",
    options: [
      "Me distraigo fácilmente",
      "Tengo algunos problemas",
      "Normal",
      "Buena concentración",
      "Excelente",
    ],
  },
  {
    id: "visualFocus",
    label: "¿Qué tan fácil te es enfocarte en un punto?",
    options: [
      "Muy difícil",
      "Difícil",
      "Normal",
      "Fácil",
      "Muy fácil",
    ],
  },
  {
    id: "memoryRetention",
    label: "¿Qué tan bien retienes lo que lees?",
    options: [
      "Olvido rápido",
      "Retengo poco",
      "Retengo lo básico",
      "Buen retención",
      "Excelente retención",
    ],
  },
];

export function DiagnosticTest({ onComplete }: DiagnosticTestProps) {
  const [step, setStep] = useState(0); // 0 = inicio, 1-4 = preguntas, 5 = estilo aprendizaje, 6 = resultados
  const [answers, setAnswers] = useState<Partial<DiagnosticQuestions>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const handleAnswer = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleNext = () => {
    if (step < QUESTIONS.length) {
      setStep(step + 1);
    } else if (step === QUESTIONS.length) {
      // Preguntar estilo de aprendizaje
      setStep(step + 1);
    } else if (step === QUESTIONS.length + 1) {
      // Mostrar resultados
      const testResult = runDiagnosticTest(answers as DiagnosticQuestions);
      setResult(testResult);
      setStep(step + 1);
      onComplete?.(testResult);
    }
  };

  const currentQuestion = QUESTIONS[step - 1];
  const progress = ((step - 1) / (QUESTIONS.length + 2)) * 100;

  if (step === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5" />
            Test de Diagnóstico Inicial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Este test rápido (5 minutos) analizará:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                Tu velocidad de lectura natural
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                Nivel de comprensión
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                Capacidad de concentración
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                Potencial de visión periférica
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                Fortaleza de memoria de trabajo
              </li>
            </ul>
          </div>

          <div className="bg-blue-500/10 border border-blue-500 rounded-lg p-4">
            <p className="text-sm font-semibold mb-2">📊 Resultado</p>
            <p className="text-xs text-muted-foreground">
              Recibirás un perfil personalizado con fortalezas, debilidades y un plan de entrenamiento adaptado a ti.
            </p>
          </div>

          <Button onClick={handleNext} size="lg" className="w-full">
            Comenzar Test
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step <= QUESTIONS.length) {
    return (
      <Card>
        <CardHeader>
          <div className="space-y-3">
            <CardTitle className="text-base">Pregunta {step} de {QUESTIONS.length}</CardTitle>
            <Progress value={progress} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="font-medium text-lg">{currentQuestion.label}</p>

          <div className="space-y-2">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(currentQuestion.id, index + 1)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  answers[currentQuestion.id as keyof DiagnosticQuestions] === index + 1
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="text-sm font-medium">{option}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 1}
            >
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              disabled={!answers[currentQuestion.id as keyof DiagnosticQuestions]}
              className="flex-1"
            >
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === QUESTIONS.length + 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tu Estilo de Aprendizaje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {[
              { id: "visual", label: "👁️ Visual", desc: "Aprendes mejor viendo" },
              { id: "auditory", label: "🎧 Auditivo", desc: "Aprendes mejor escuchando" },
              {
                id: "kinesthetic",
                label: "✋ Kinestésico",
                desc: "Aprendes haciendo",
              },
              {
                id: "reading-writing",
                label: "📝 Lectura/Escritura",
                desc: "Aprendes leyendo y escribiendo",
              },
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => handleAnswer("learningPreference", style.id as any)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  answers.learningPreference === style.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">{style.label}</p>
                <p className="text-xs text-muted-foreground">{style.desc}</p>
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep(QUESTIONS.length)}
            >
              Anterior
            </Button>
            <Button
              onClick={handleNext}
              disabled={!answers.learningPreference}
              className="flex-1"
            >
              Ver Resultados
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        {/* Resumen General */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="size-5 text-green-600" />
              Tu Perfil de Lector
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="text-center p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Velocidad</p>
                <p className="text-2xl font-bold">{result.readingSpeed}</p>
                <p className="text-xs">WPM</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Comprensión</p>
                <p className="text-2xl font-bold">{result.comprehension}%</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Concentración</p>
                <p className="text-2xl font-bold">{result.focusLevel}%</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Visión Periférica</p>
                <p className="text-2xl font-bold">{result.peripheralVision}%</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Memoria</p>
                <p className="text-2xl font-bold">{result.workingMemory}%</p>
              </div>
              <div className="text-center p-3 bg-secondary rounded">
                <p className="text-xs text-muted-foreground">Tipo</p>
                <p className="text-sm font-bold capitalize">{result.learnerType}</p>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500 rounded p-3">
              <p className="text-sm font-semibold capitalize mb-1">
                {result.readerProfile.replace("-", " ")}
              </p>
              <p className="text-xs text-muted-foreground">
                Tu estilo de lectura actual
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fortalezas */}
        {result.strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle className="size-4 text-green-600" />
                Fortalezas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="text-green-600">✓</span>
                    {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Debilidades */}
        {result.weaknesses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="size-4 text-orange-600" />
                Áreas de Mejora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {result.weaknesses.map((w, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="text-orange-600">⚠</span>
                    {w}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Recomendaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="size-4 text-yellow-600" />
              Plan Personalizado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-yellow-600 mt-0.5">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
