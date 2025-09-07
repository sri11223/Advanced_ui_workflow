// utils/wireframeParser.js
export class WireframeParser {
  static parseJSON(rawContent) {
    try {
      // Clean the response
      let cleanedResponse = rawContent
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .replace(/^\s*[\r\n]/, "")
        .trim();

      // Handle incomplete JSON - find last complete brace
      if (!cleanedResponse.endsWith('}')) {
        const lastBraceIndex = cleanedResponse.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
          cleanedResponse = cleanedResponse.substring(0, lastBraceIndex + 1);
          console.log("⚠️ Truncated incomplete JSON");
        } else {
          throw new Error("No valid JSON structure found");
        }
      }

      // Parse the JSON
      const wireframeData = JSON.parse(cleanedResponse);
      
      // Ensure proper structure
      if (!wireframeData.json) {
        console.log("📦 Wrapping response in json key");
        return { json: wireframeData };
      }

      // Validate and enhance structure
      return this.validateAndEnhance(wireframeData);

    } catch (error) {
      console.error("❌ JSON parsing failed:", error.message);
      
      // Try to extract partial JSON using regex
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const partialData = JSON.parse(jsonMatch[0]);
          console.log("✅ Recovered partial JSON");
          return this.validateAndEnhance({ json: partialData });
        } catch (e) {
          console.error("❌ Partial JSON recovery failed");
        }
      }

      return null; // Return null to trigger fallback
    }
  }

  static validateAndEnhance(wireframeData) {
    // Ensure components have required properties
    if (wireframeData.json.pages) {
      // Multi-page structure
      wireframeData.json.pages = wireframeData.json.pages.map(page => ({
        ...page,
        id: page.id || this.generateId(),
        name: page.name || 'Page',
        path: page.path || `/${page.name?.toLowerCase().replace(/\s+/g, '-')}`,
        components: this.processComponents(page.components || [])
      }));
    } else if (wireframeData.json.components) {
      // Single page structure
      wireframeData.json.components = this.processComponents(wireframeData.json.components);
    }

    return wireframeData;
  }

  static processComponents(components) {
    return components.map((comp, index) => {
      const processedComp = {
        id: comp.id || this.generateId(),
        type: comp.type || 'rect',
        text: comp.text || comp.label || this.getDefaultText(comp.type),
        x: this.ensureNumber(comp.x, 50 + (index % 3) * 120),
        y: this.ensureNumber(comp.y, 50 + Math.floor(index / 3) * 80),
        width: this.ensureNumber(comp.width, this.getDefaultWidth(comp.type)),
        height: this.ensureNumber(comp.height, this.getDefaultHeight(comp.type)),
        fill: comp.backgroundColor || comp.fill || this.getDefaultFill(comp.type),
        stroke: comp.borderColor || comp.stroke || '#D1D5DB',
        strokeWidth: this.ensureNumber(comp.strokeWidth, 1),
        textColor: comp.textColor || this.getDefaultTextColor(comp.type),
        fontSize: this.ensureNumber(comp.fontSize, this.getDefaultFontSize(comp.type)),
        fontWeight: comp.fontWeight || 'normal',
        fontFamily: comp.fontFamily || 'Arial',
        borderRadius: this.ensureNumber(comp.borderRadius, this.getDefaultBorderRadius(comp.type)),
        placeholder: comp.placeholder || '',
        // Handle nested children recursively
        children: comp.children ? this.processComponents(comp.children) : undefined
      };

      // Remove undefined properties to keep JSON clean
      return Object.fromEntries(
        Object.entries(processedComp).filter(([_, value]) => value !== undefined)
      );
    });
  }

  static ensureNumber(value, defaultValue) {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  static generateId() {
    return `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static getDefaultText(type) {
    const defaults = {
      'text': 'Text Content',
      'heading': 'Heading',
      'button': 'Button',
      'input': '',
      'image': 'Image',
      'placeholder': 'Placeholder'
    };
    return defaults[type] || 'Component';
  }

  static getDefaultWidth(type) {
    const defaults = {
      'button': 120,
      'input': 200,
      'text': 150,
      'heading': 250,
      'image': 200,
      'placeholder': 200
    };
    return defaults[type] || 100;
  }

  static getDefaultHeight(type) {
    const defaults = {
      'button': 40,
      'input': 35,
      'text': 30,
      'heading': 40,
      'image': 150,
      'placeholder': 150
    };
    return defaults[type] || 50;
  }

  static getDefaultFill(type) {
    const defaults = {
      'button': '#3B82F6',
      'input': '#FFFFFF',
      'text': '#F9FAFB',
      'heading': '#F9FAFB',
      'image': '#F3F4F6',
      'placeholder': '#F3F4F6'
    };
    return defaults[type] || '#F9FAFB';
  }

  static getDefaultTextColor(type) {
    const defaults = {
      'button': '#FFFFFF',
      'text': '#374151',
      'heading': '#1F2937',
      'input': '#374151'
    };
    return defaults[type] || '#374151';
  }

  static getDefaultFontSize(type) {
    const defaults = {
      'heading': 24,
      'button': 16,
      'text': 14,
      'input': 14
    };
    return defaults[type] || 14;
  }

  static getDefaultBorderRadius(type) {
    const defaults = {
      'button': 8,
      'input': 6,
      'text': 4,
      'image': 4
    };
    return defaults[type] || 4;
  }
}
