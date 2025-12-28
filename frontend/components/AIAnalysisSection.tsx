
import React, { useState, useEffect } from 'react';
import { streamAnalysisNode } from '../services/geminiService';
import { Stock } from '../src/types';

interface AIAnalysisSectionProps {
  stock: Stock | null;
  triggerKey: number; // Increment to restart analysis
}

const AIAnalysisSection: React.FC<AIAnalysisSectionProps> = ({ stock, triggerKey }) => {
  const [nodes, setNodes] = useState({
    doubao: '',
    kimiFundamental: '',
    kimiSentiment: '',
    gptDecision: ''
  });
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'completed'>('idle');

  useEffect(() => {
    if (!stock) return;

    const runAnalysis = async () => {
      setNodes({ doubao: '', kimiFundamental: '', kimiSentiment: '', gptDecision: '' });
      setStatus('analyzing');

      const payload = {
        stockName: stock.name,
        symbol: stock.symbol,
        themes: stock.themes
      };

      // Parallel streaming for first 3 nodes
      await Promise.all([
        streamAnalysisNode('Doubao', payload, '', (chunk) => {
          setNodes(prev => ({ ...prev, doubao: prev.doubao + chunk }));
        }),
        streamAnalysisNode('KIMI Fundamental', payload, '', (chunk) => {
          setNodes(prev => ({ ...prev, kimiFundamental: prev.kimiFundamental + chunk }));
        }),
        streamAnalysisNode('KIMI Sentiment', payload, '', (chunk) => {
          setNodes(prev => ({ ...prev, kimiSentiment: prev.kimiSentiment + chunk }));
        })
      ]);

      // Last node depends on context of previous nodes
      setNodes(prev => {
        const context = `
          豆包基本面: ${prev.doubao}
          KIMI基本面: ${prev.kimiFundamental}
          KIMI情绪面: ${prev.kimiSentiment}
        `;
        streamAnalysisNode('GPT Decision', payload, context, (chunk) => {
          setNodes(n => ({ ...n, gptDecision: n.gptDecision + chunk }));
        }).then(() => setStatus('completed'));
        return prev;
      });
    };

    runAnalysis();
  }, [stock, triggerKey]);

  if (!stock) return null;

  return (
    <div className="mt-4 border rounded-lg bg-gray-50 overflow-hidden">
      <div className="bg-white px-4 py-2 border-b flex justify-between items-center">
        <h3 className="font-bold text-gray-700 flex items-center">
          <span className="mr-2">✨</span> AI 基本面深度研究
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full ${status === 'analyzing' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
          {status === 'analyzing' ? '分析中...' : '分析完成'}
        </span>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Parallel Nodes */}
        <div className="bg-white p-3 rounded shadow-sm border border-blue-50">
          <div className="text-xs font-bold text-blue-600 mb-2">豆包基本面</div>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap h-40 overflow-y-auto">
            {nodes.doubao || (status === 'analyzing' && <div className="animate-pulse">正在生成结论...</div>)}
          </div>
        </div>
        <div className="bg-white p-3 rounded shadow-sm border border-purple-50">
          <div className="text-xs font-bold text-purple-600 mb-2">KIMI 基本面</div>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap h-40 overflow-y-auto">
            {nodes.kimiFundamental || (status === 'analyzing' && <div className="animate-pulse">深度拆解中...</div>)}
          </div>
        </div>
        <div className="bg-white p-3 rounded shadow-sm border border-pink-50">
          <div className="text-xs font-bold text-pink-600 mb-2">KIMI 情绪面</div>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap h-40 overflow-y-auto">
            {nodes.kimiSentiment || (status === 'analyzing' && <div className="animate-pulse">情绪扫描中...</div>)}
          </div>
        </div>
      </div>

      {/* Decision Node */}
      <div className="px-4 pb-4">
        <div className="bg-indigo-900 p-4 rounded-lg shadow-inner text-white">
          <div className="text-xs font-bold text-indigo-300 mb-2 uppercase tracking-widest flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V7h2v2z"/></svg>
            GPT 最终决策分析
          </div>
          <div className="text-sm leading-relaxed whitespace-pre-wrap min-h-24">
            {nodes.gptDecision || (status === 'analyzing' && nodes.doubao && <div className="italic text-indigo-300 animate-pulse">汇聚三方分析，等待最终决策生成...</div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAnalysisSection;
