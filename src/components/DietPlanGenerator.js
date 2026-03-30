import React, { useState } from 'react';
import { User, Target, Activity, Heart, AlertCircle, Utensils, Plus, Loader2 } from 'lucide-react';
import NavigationBar from './NavigationBar'; // Adjust path if needed

import '../styles/DietPlanGenerator.css';

const DietPlanGenerator = () => {
  const [formData, setFormData] = useState({
    age: '',
    gender: 'male',
    currentWeight: '',
    height: '',
    activityLevel: 'sedentary',
    goal: 'weight loss',
    targetWeight: '',
    dietaryPreferences: 'balanced',
    healthConditions: '',
    foodAllergies: '',
    mealsPerDay: 3
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState(null);
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Updated SSE response parser
  const parseSSEResponse = (sseData) => {
    const lines = sseData.split('\n');
    let result = null;
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.substring(6).trim();
        if (data === '[DONE]') {
          break;
        }
        try {
          // Parse the JSON array format you're receiving
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
            result = parsed[0]; // Extract the diet plan string from the array
          }
        } catch (e) {
          console.log('Could not parse SSE data:', data);
        }
      }
    }
    
    return result;
  };

  const pollForResult = async (eventId, maxAttempts = 30, intervalMs = 2000) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        setLoadingMessage(`Generating your diet plan... (${attempts + 1}/${maxAttempts})`);
        
        const response = await fetch(`https://rishi002-dietplangenerator.hf.space/gradio_api/call/generate_diet_plan/${eventId}`);
        
        if (!response.ok) {
          throw new Error(`Poll request failed with status ${response.status}`);
        }
        
        // Handle SSE response
        const sseData = await response.text();
        console.log('SSE Response:', sseData);
        
        const result = parseSSEResponse(sseData);
        
        if (result && typeof result === 'string' && result.trim().length > 0) {
          return result;
        }
        
        // If not ready, wait before next attempt
        await sleep(intervalMs);
        attempts++;
        
      } catch (error) {
        console.error(`Poll attempt ${attempts + 1} failed:`, error);
        attempts++;
        await sleep(intervalMs);
      }
    }
    
    throw new Error('Maximum polling attempts reached. The API might be taking longer than expected.');
  };

  const generateDietPlan = async () => {
    if (!formData.age || !formData.currentWeight || !formData.height || !formData.targetWeight) {
      setError('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    setError('');
    setLoadingMessage('Initiating diet plan generation...');

    try {
      console.log('Attempting to call API...');
      
      // Step 1: Make the initial API call
      const response = await fetch('https://rishi002-dietplangenerator.hf.space/gradio_api/call/generate_diet_plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [
            parseInt(formData.age),
            formData.gender,
            parseFloat(formData.currentWeight),
            parseFloat(formData.height),
            formData.activityLevel,
            formData.goal,
            parseFloat(formData.targetWeight),
            formData.dietaryPreferences,
            formData.healthConditions,
            formData.foodAllergies,
            parseInt(formData.mealsPerDay)
          ]
        })
      });

      console.log('Initial API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`API returned status ${response.status}`);
      }

      // Step 2: Parse the initial response to get the event ID
      const initialData = await response.json();
      console.log('Initial response data:', initialData);
      
      const eventId = initialData.event_id;
      if (!eventId) {
        throw new Error('No event ID received from the API');
      }

      console.log('Event ID:', eventId);
      setLoadingMessage('Request submitted. Waiting for AI to generate your plan...');

      // Step 3: Wait a bit before starting to poll (AI needs time to process)
      await sleep(3000);

      // Step 4: Poll for the result
      const result = await pollForResult(eventId, 40, 2000); // Poll for up to 80 seconds with 2-second intervals
      
      if (result) {
        console.log('Diet plan generated successfully');
        setDietPlan(result);
        setLoadingMessage('');
      } else {
        throw new Error('No diet plan received from API');
      }

    } catch (err) {
      console.error('API Error:', err);
      setError(`Failed to generate diet plan: ${err.message}. Please try again later.`);
      setLoadingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      age: '',
      gender: 'male',
      currentWeight: '',
      height: '',
      activityLevel: 'sedentary',
      goal: 'weight loss',
      targetWeight: '',
      dietaryPreferences: 'balanced',
      healthConditions: '',
      foodAllergies: '',
      mealsPerDay: 3
    });
    setDietPlan(null);
    setError('');
    setLoadingMessage('');
  };

  // Enhanced markdown formatting for diet plan
  const formatDietPlan = (planText) => {
    if (!planText) return '';
    
    let formattedText = planText;
    
    // Convert markdown to HTML with improved styling
    formattedText = formattedText
      // Headers
      .replace(/^# (.*$)/gm, '<h1 style="color: #1e40af; font-size: 2rem; font-weight: bold; margin: 1.5rem 0 1rem 0; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem;">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 style="color: #059669; font-size: 1.5rem; font-weight: bold; margin: 1.25rem 0 0.75rem 0; border-left: 4px solid #10b981; padding-left: 1rem;">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 style="color: #dc2626; font-size: 1.25rem; font-weight: bold; margin: 1rem 0 0.5rem 0; background-color: #fee2e2; padding: 0.5rem 1rem; border-radius: 0.5rem;">$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4 style="color: #7c3aed; font-size: 1.1rem; font-weight: bold; margin: 0.75rem 0 0.5rem 0;">$1</h4>')
      
      // Bold and italic text
      .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #374151; font-weight: 700;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="color: #6b7280; font-style: italic;">$1</em>')
      
      // Lists
      .replace(/^- (.*$)/gm, '<div style="margin: 0.25rem 0; padding-left: 1rem; border-left: 2px solid #e5e7eb;"><span style="color: #3b82f6; font-weight: 600;">•</span> $1</div>')
      
      // Line breaks
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    
    return formattedText;
  };

  return (
  <>
    <NavigationBar />
    <div className="py-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>

   <div className="container">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Utensils size={32} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Diet Plan Generator</h1>
          <p className="text-gray-600">Create a personalized diet plan tailored to your goals and preferences</p>
        </div>

        {!dietPlan ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="border-b pb-4">
                <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                  <User size={20} className="mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Age *</label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="Enter your age"
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                    <select 
                      name="gender" 
                      value={formData.gender} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Physical Metrics */}
              <div className="border-b pb-4">
                <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                  <Target size={20} className="mr-2 text-green-600" />
                  Physical Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Weight (kg) *</label>
                    <input
                      type="number"
                      name="currentWeight"
                      value={formData.currentWeight}
                      onChange={handleInputChange}
                      placeholder="Enter current weight"
                      min="30"
                      max="300"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm) *</label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      placeholder="Enter height"
                      min="100"
                      max="250"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Weight (kg) *</label>
                  <input
                    type="number"
                    name="targetWeight"
                    value={formData.targetWeight}
                    onChange={handleInputChange}
                    placeholder="Enter target weight"
                    min="30"
                    max="300"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Activity & Goals */}
              <div className="border-b pb-4">
                <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                  <Activity size={20} className="mr-2 text-purple-600" />
                  Activity & Goals
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Activity Level</label>
                    <select 
                      name="activityLevel" 
                      value={formData.activityLevel} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sedentary">Sedentary (little to no exercise)</option>
                      <option value="light">Light (light exercise 1-3 days/week)</option>
                      <option value="moderate">Moderate (moderate exercise 3-5 days/week)</option>
                      <option value="active">Active (hard exercise 6-7 days/week)</option>
                      <option value="very_active">Very Active (physical job + exercise)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Goal</label>
                    <select 
                      name="goal" 
                      value={formData.goal} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="weight loss">Weight Loss</option>
                      <option value="weight gain">Weight Gain</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dietary Preferences */}
              <div className="border-b pb-4">
                <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                  <Heart size={20} className="mr-2 text-red-600" />
                  Dietary Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
                    <select 
                      name="dietaryPreferences" 
                      value={formData.dietaryPreferences} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="balanced">Balanced</option>
                      <option value="vegetarian">Vegetarian</option>
                      <option value="vegan">Vegan</option>
                      <option value="keto">Keto</option>
                      <option value="paleo">Paleo</option>
                      <option value="mediterranean">Mediterranean</option>
                      <option value="low_carb">Low Carb</option>
                      <option value="high_protein">High Protein</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Meals per Day</label>
                    <select 
                      name="mealsPerDay" 
                      value={formData.mealsPerDay} 
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={3}>3 Meals</option>
                      <option value={4}>4 Meals</option>
                      <option value={5}>5 Meals</option>
                      <option value={6}>6 Meals</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Health Information */}
              <div>
                <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-4">
                  <AlertCircle size={20} className="mr-2 text-orange-600" />
                  Health Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Health Conditions</label>
                    <input
                      type="text"
                      name="healthConditions"
                      value={formData.healthConditions}
                      onChange={handleInputChange}
                      placeholder="e.g., Diabetes, Hypertension, etc. (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Food Allergies</label>
                    <input
                      type="text"
                      name="foodAllergies"
                      value={formData.foodAllergies}
                      onChange={handleInputChange}
                      placeholder="e.g., Nuts, Dairy, Gluten, etc. (optional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loading message */}
            {isLoading && loadingMessage && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center text-blue-700">
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {loadingMessage}
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center text-red-700">
                  <AlertCircle size={16} className="mr-2" />
                  {error}
                </div>
              </div>
            )}

            <div className="mt-6 flex gap-4 justify-center">
              <button 
                type="button" 
                onClick={resetForm} 
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Reset Form
              </button>
              <button 
                type="button" 
                onClick={generateDietPlan} 
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Generate Diet Plan
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Personalized Diet Plan</h2>
              <div className="flex gap-2">
                <button 
                  onClick={() => window.print()} 
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Print Plan
                </button>
                <button 
                  onClick={resetForm} 
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Create New Plan
                </button>
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6 border border-gray-200">
              <div 
                className="prose prose-lg max-w-none"
                style={{ 
                  lineHeight: '1.7',
                  color: '#374151'
                }}
                dangerouslySetInnerHTML={{ __html: formatDietPlan(dietPlan) }}
              />
            </div>
          </div>
        )}
      </div>
        </div>
  </>
);

};

export default DietPlanGenerator;