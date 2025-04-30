import React, { useState } from 'react';
import { Play, Save, PlusCircle, CheckCircle, Code, FileText, Trash2, Download, Upload, ChevronRight, Lightbulb, CheckCircle2, AlignLeft, RefreshCw } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface NotebookCell {
  id: string;
  type: 'code' | 'markdown';
  content: string;
  output?: any;
  isExecuting?: boolean;
  isActive?: boolean;
}

const NotebookPage: React.FC = () => {
  const { connectionStatus } = useAppContext();
  const [notebookName, setNotebookName] = useState<string>('Untitled Notebook');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [copilotOpen, setCopilotOpen] = useState<boolean>(true);
  const [copilotQuery, setCopilotQuery] = useState<string>('');
  const [copilotSuggestions, setCopilotSuggestions] = useState<string[]>([
    'Generate a bar chart of sales by category',
    'Calculate correlation between order value and customer age',
    'Perform time series analysis on monthly sales',
  ]);

  // Initial cells
  const [cells, setCells] = useState<NotebookCell[]>([
    {
      id: '1',
      type: 'markdown',
      content: '# Data Analysis Notebook\n\nThis notebook demonstrates how to analyze the results from our query using Python and plotting libraries.',
      isActive: false,
    },
    {
      id: '2',
      type: 'code',
      content: '# Import libraries\nimport pandas as pd\nimport matplotlib.pyplot as plt\nimport seaborn as sns\n\n# Set plot style\nsns.set(style="whitegrid")\nplt.rcParams["figure.figsize"] = (10, 6)',
      isActive: false,
    },
    {
      id: '3',
      type: 'code',
      content: '# Load data from our previous query\ndf = pd.DataFrame({\n    "category": ["Electronics", "Home & Kitchen", "Clothing", "Sports & Outdoors", "Beauty & Personal Care", "Books", "Toys & Games"],\n    "total_sales": [527350.75, 423150.25, 356280.50, 289750.00, 157680.75, 98540.25, 76520.50]\n})\n\ndf.head()',
      output: `   category  total_sales
0  Electronics   527350.75
1  Home & Kitchen   423150.25
2  Clothing   356280.50
3  Sports & Outdoors   289750.00
4  Beauty & Personal Care   157680.75`,
      isActive: true,
    },
    {
      id: '4',
      type: 'markdown',
      content: '## Sales Analysis\n\nLet\'s visualize the sales data by category with a bar chart to identify top performing categories.',
      isActive: false,
    },
    {
      id: '5',
      type: 'code',
      content: '# Create a bar chart of total sales by category\nplt.figure(figsize=(12, 6))\nsns.barplot(x="category", y="total_sales", data=df.sort_values("total_sales", ascending=False), palette="viridis")\nplt.title("Total Sales by Product Category", fontsize=16)\nplt.xlabel("Category", fontsize=12)\nplt.ylabel("Total Sales ($)", fontsize=12)\nplt.xticks(rotation=45)\nplt.tight_layout()\nplt.show()',
      output: { type: 'image', url: 'https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' },
      isActive: false,
    },
  ]);

  const handleCellContentChange = (id: string, content: string) => {
    setCells(cells.map(cell => 
      cell.id === id ? { ...cell, content } : cell
    ));
  };

  const handleCellTypeChange = (id: string, type: 'code' | 'markdown') => {
    setCells(cells.map(cell => 
      cell.id === id ? { ...cell, type } : cell
    ));
  };

  const handleCellActive = (id: string) => {
    setCells(cells.map(cell => 
      ({ ...cell, isActive: cell.id === id })
    ));
  };

  const addCellAfter = (id: string, type: 'code' | 'markdown' = 'code') => {
    const index = cells.findIndex(cell => cell.id === id);
    const newCell: NotebookCell = {
      id: Date.now().toString(),
      type,
      content: '',
      isActive: true,
    };
    
    const newCells = [...cells];
    newCells.splice(index + 1, 0, newCell);
    
    setCells(newCells.map(cell => 
      ({ ...cell, isActive: cell.id === newCell.id })
    ));
  };

  const deleteCell = (id: string) => {
    if (cells.length <= 1) return; // Don't allow deleting the last cell
    
    const index = cells.findIndex(cell => cell.id === id);
    const newCells = cells.filter(cell => cell.id !== id);
    
    // Make the next cell active, or the previous if we deleted the last one
    if (newCells.length > 0) {
      const newActiveIndex = Math.min(index, newCells.length - 1);
      newCells[newActiveIndex].isActive = true;
    }
    
    setCells(newCells);
  };

  const executeCell = (id: string) => {
    setCells(cells.map(cell => 
      cell.id === id ? { ...cell, isExecuting: true } : cell
    ));
    
    // Simulate execution delay
    setTimeout(() => {
      setCells(cells.map(cell => {
        if (cell.id === id) {
          let output;
          
          // Mock outputs based on content
          if (cell.content.includes('df.head()')) {
            output = `   category  total_sales
0  Electronics   527350.75
1  Home & Kitchen   423150.25
2  Clothing   356280.50
3  Sports & Outdoors   289750.00
4  Beauty & Personal Care   157680.75`;
          } else if (cell.content.includes('barplot')) {
            output = { type: 'image', url: 'https://images.pexels.com/photos/7567434/pexels-photo-7567434.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' };
          } else if (cell.content.includes('plt.')) {
            output = { type: 'image', url: 'https://images.pexels.com/photos/5496464/pexels-photo-5496464.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2' };
          } else if (cell.content.includes('correlation')) {
            output = `
              customer_age  order_value
customer_age     1.000000      0.687542
order_value      0.687542      1.000000`;
          } else if (cell.content.trim()) {
            output = 'Executed successfully';
          }
          
          return { ...cell, isExecuting: false, output };
        }
        return cell;
      }));
    }, 1500);
  };

  const executeAllCells = () => {
    cells.forEach((cell, index) => {
      if (cell.type === 'code') {
        setTimeout(() => executeCell(cell.id), index * 1000);
      }
    });
  };

  const handleCopilotSuggestion = (suggestion: string) => {
    // Find the active cell or the last code cell
    const activeCell = cells.find(cell => cell.isActive && cell.type === 'code');
    const lastCodeCell = [...cells].reverse().find(cell => cell.type === 'code');
    const targetCell = activeCell || lastCodeCell;
    
    if (targetCell) {
      let newContent = '';
      
      // Generate mock code based on suggestion
      if (suggestion.includes('bar chart')) {
        newContent = `# Generate bar chart of sales by category
plt.figure(figsize=(12, 6))
ax = sns.barplot(x="category", y="total_sales", data=df, palette="viridis")
plt.title("Sales by Product Category")
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()`;
      } else if (suggestion.includes('correlation')) {
        newContent = `# Calculate correlation between order value and customer age
customer_data = pd.DataFrame({
    "customer_age": [25, 34, 29, 48, 52, 31, 42, 39, 45, 28],
    "order_value": [120, 250, 180, 340, 410, 190, 280, 220, 320, 150]
})

# Calculate correlation matrix
correlation = customer_data.corr()
print(correlation)

# Visualize with a heatmap
plt.figure(figsize=(8, 6))
sns.heatmap(correlation, annot=True, cmap="coolwarm", vmin=-1, vmax=1)
plt.title("Correlation Heatmap")
plt.tight_layout()
plt.show()`;
      } else if (suggestion.includes('time series')) {
        newContent = `# Time series analysis on monthly sales
monthly_sales = pd.DataFrame({
    "date": pd.date_range(start="2023-01-01", periods=12, freq="M"),
    "sales": [125000, 140000, 160000, 180000, 210000, 230000, 245000, 240000, 220000, 200000, 190000, 240000]
})

monthly_sales.set_index("date", inplace=True)

# Plot the time series
plt.figure(figsize=(12, 6))
plt.plot(monthly_sales.index, monthly_sales.sales, marker='o', linestyle='-')
plt.title("Monthly Sales (2023)")
plt.xlabel("Month")
plt.ylabel("Sales ($)")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()`;
      }
      
      setCells(cells.map(cell => 
        cell.id === targetCell.id ? { ...cell, content: newContent, isActive: true } : { ...cell, isActive: false }
      ));
    } else {
      // If no code cell exists, create one
      const newCell: NotebookCell = {
        id: Date.now().toString(),
        type: 'code',
        content: '# Generated from Copilot suggestion\n',
        isActive: true,
      };
      
      setCells([...cells, newCell]);
    }
  };

  if (!connectionStatus) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-xl font-medium text-gray-900">Database Connection Required</h2>
          <p className="mt-2 text-sm text-gray-500">
            Please connect to a Snowflake database before using the notebook
          </p>
          <a href="/connect" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700">
            Connect to Database
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Notebook header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {isEditingName ? (
              <div className="flex items-center">
                <input
                  type="text"
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-64 sm:text-lg border-gray-300 rounded-md font-medium"
                  value={notebookName}
                  onChange={(e) => setNotebookName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  autoFocus
                />
                <CheckCircle
                  className="ml-2 h-5 w-5 text-primary-600 cursor-pointer"
                  onClick={() => setIsEditingName(false)}
                />
              </div>
            ) : (
              <h1
                className="text-xl font-medium text-gray-900 cursor-pointer"
                onClick={() => setIsEditingName(true)}
              >
                {notebookName}
              </h1>
            )}
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Saved
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Upload className="mr-2 h-4 w-4 text-gray-500" />
              Share
            </button>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Download className="mr-2 h-4 w-4 text-gray-500" />
              Export
            </button>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={executeAllCells}
            >
              <Play className="mr-2 h-4 w-4" />
              Run All
            </button>
          </div>
        </div>
      </div>

      {/* Main notebook area */}
      <div className="flex-1 overflow-hidden flex">
        {/* Notebook cells */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {cells.map((cell) => (
              <div
                key={cell.id}
                className={`notebook-cell ${cell.isActive ? 'notebook-cell-active' : ''}`}
                onClick={() => handleCellActive(cell.id)}
              >
                {/* Cell toolbar */}
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <div className="flex border border-gray-300 rounded-md overflow-hidden">
                      <button
                        type="button"
                        className={`px-3 py-1 text-xs font-medium ${
                          cell.type === 'code'
                            ? 'bg-primary-100 text-primary-800'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleCellTypeChange(cell.id, 'code')}
                      >
                        <Code className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1 text-xs font-medium ${
                          cell.type === 'markdown'
                            ? 'bg-primary-100 text-primary-800'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                        onClick={() => handleCellTypeChange(cell.id, 'markdown')}
                      >
                        <AlignLeft className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {cell.type === 'code' && (
                      <button
                        type="button"
                        className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                        onClick={() => executeCell(cell.id)}
                      >
                        {cell.isExecuting ? (
                          <RefreshCw className="h-4 w-4 animate-spin text-primary-500" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                      onClick={() => addCellAfter(cell.id)}
                    >
                      <PlusCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                      onClick={() => deleteCell(cell.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Cell content */}
                <div className="px-4 py-3">
                  <textarea
                    className="w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm font-mono"
                    rows={cell.content.split('\n').length}
                    placeholder={cell.type === 'code' ? "Enter code..." : "Enter markdown..."}
                    value={cell.content}
                    onChange={(e) => handleCellContentChange(cell.id, e.target.value)}
                  ></textarea>
                </div>

                {/* Cell output (for code cells) */}
                {cell.type === 'code' && cell.output && (
                  <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
                    <div className="text-xs text-gray-500 mb-1">Output:</div>
                    {typeof cell.output === 'string' ? (
                      <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono overflow-x-auto">
                        {cell.output}
                      </pre>
                    ) : cell.output.type === 'image' ? (
                      <img 
                        src={cell.output.url} 
                        alt="Output visualization" 
                        className="mt-2 max-w-full h-auto rounded-md"
                      />
                    ) : null}
                  </div>
                )}
              </div>
            ))}

            {/* Add cell button at the end */}
            <div className="flex justify-center">
              <button
                type="button"
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => addCellAfter(cells[cells.length - 1].id)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Cell
              </button>
            </div>
          </div>
        </div>

        {/* Copilot panel */}
        <div className={`border-l border-gray-200 bg-white ${copilotOpen ? 'w-80' : 'w-10'} transition-all duration-300 flex flex-col`}>
          {copilotOpen ? (
            <>
              <div className="border-b border-gray-200 px-4 py-4 flex justify-between items-center">
                <div className="flex items-center">
                  <Lightbulb className="h-5 w-5 text-amber-500 mr-2" />
                  <h3 className="text-sm font-medium text-gray-900">AI Copilot</h3>
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => setCopilotOpen(false)}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4">
                <div className="mb-4">
                  <label htmlFor="copilot-query" className="block text-sm font-medium text-gray-700 mb-1">
                    Ask for help or suggestions
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="text"
                      name="copilot-query"
                      id="copilot-query"
                      className="focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="E.g., Plot sales by region"
                      value={copilotQuery}
                      onChange={(e) => setCopilotQuery(e.target.value)}
                    />
                    <div className="absolute inset-y-0 right-0 flex py-1.5 pr-1.5">
                      <button
                        type="button"
                        className="inline-flex items-center border border-transparent rounded px-2 text-sm font-medium text-primary-700 bg-primary-100 hover:bg-primary-200"
                      >
                        Ask
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                    Suggestions
                  </h4>
                  <ul className="space-y-2">
                    {copilotSuggestions.map((suggestion, index) => (
                      <li key={index}>
                        <button
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md"
                          onClick={() => handleCopilotSuggestion(suggestion)}
                        >
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wider mb-2">
                    Insights
                  </h4>
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex">
                      <CheckCircle2 className="h-5 w-5 text-blue-400 mr-2" />
                      <div>
                        <p className="text-sm text-blue-700 font-medium">Data Quality Analysis</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Your dataset is complete with no missing values. Consider adding time-based analysis to identify trends.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <button
              className="flex items-center justify-center h-full w-full hover:bg-gray-50"
              onClick={() => setCopilotOpen(true)}
            >
              <Lightbulb className="h-5 w-5 text-amber-500" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookPage;