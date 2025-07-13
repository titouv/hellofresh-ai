"use client";

import { Step } from "../../recipe_types";
import { useState } from "react";

interface RecipeStepsProps {
  steps: Step[];
  currentStepIndex?: number;
  onStepChange?: (index: number) => void;
}

export function RecipeSteps({ steps, currentStepIndex = 0, onStepChange }: RecipeStepsProps) {
  const [activeStep, setActiveStep] = useState(currentStepIndex);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    onStepChange?.(index);
  };

  const nextStep = () => {
    if (activeStep < steps.length - 1) {
      const newIndex = activeStep + 1;
      setActiveStep(newIndex);
      onStepChange?.(newIndex);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) {
      const newIndex = activeStep - 1;
      setActiveStep(newIndex);
      onStepChange?.(newIndex);
    }
  };

  if (!steps || steps.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6">
        <div className="text-center text-gray-500">
          <span className="text-2xl mb-2 block">👨‍🍳</span>
          <p>Aucune étape disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-green-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          Étapes de préparation
        </h2>
        <div className="text-sm text-gray-500">
          {activeStep + 1} / {steps.length}
        </div>
      </div>

      <div className="space-y-4">
        {/* Navigation des étapes */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => handleStepClick(index)}
              className={`flex-shrink-0 w-8 h-8 rounded-full text-sm font-medium transition-all ${
                index === activeStep
                  ? "bg-green-600 text-white shadow-md"
                  : index <= activeStep
                  ? "bg-green-200 text-green-800 hover:bg-green-300"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {/* Étape actuelle */}
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
              {activeStep + 1}
            </div>
            <div className="flex-1">
              <div 
                className="text-gray-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: steps[activeStep].instructionsHTML }}
              />
              {steps[activeStep].images && steps[activeStep].images.length > 0 && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {steps[activeStep].images.map((image, idx) => {
                    const baseImageUrl = "https://img.hellofresh.com/w_384,q_auto,f_auto,c_limit,fl_lossy/hellofresh_s3/";
                    const imageUrl = image.link ? baseImageUrl + image.link : '';
                    return (
                      <div key={idx} className="relative">
                        <img
                          src={imageUrl}
                          alt={image.caption || `Étape ${activeStep + 1}`}
                          className="w-full h-40 sm:h-32 object-cover rounded-lg shadow-sm border border-gray-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                        {image.caption && (
                          <p className="text-xs text-gray-600 mt-1">{image.caption}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Contrôles de navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={prevStep}
            disabled={activeStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span>←</span>
            <span>Précédent</span>
          </button>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            )}
            <div className={`w-2 h-2 rounded-full ${
              activeStep === steps.length - 1 ? 'bg-green-600' : 'bg-gray-300'
            }`}></div>
            {activeStep < steps.length - 1 && (
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
            )}
          </div>

          <button
            onClick={nextStep}
            disabled={activeStep === steps.length - 1}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <span>Suivant</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Liste complète des étapes (repliable) */}
      <details className="mt-6 group">
        <summary className="cursor-pointer text-sm text-green-600 hover:text-green-700 font-medium">
          Voir toutes les étapes
        </summary>
        <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                index === activeStep
                  ? "bg-green-100 border-green-300"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
              onClick={() => handleStepClick(index)}
            >
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  index === activeStep
                    ? "bg-green-600 text-white"
                    : "bg-gray-400 text-white"
                }`}>
                  {index + 1}
                </div>
                <div 
                  className="text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: step.instructionsHTML }}
                />
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}