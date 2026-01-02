import { useEffect, useRef, useState } from 'react';
import { Line } from '@antv/g2plot';
import { Modal, Typography, Row, Col, Card, Statistic } from 'antd';
import { fetchStrategyReturns } from '../services/api';

const { Title, Text } = Typography;

interface StrategyReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategyName: string;
  strategyId: string;
}

const StrategyReturnModal = ({ isOpen, onClose, strategyName, strategyId }: StrategyReturnModalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Line | null>(null);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchStrategyReturns(strategyId).then((res: any) => setData(res));
    }
  }, [isOpen, strategyId]);

  useEffect(() => {
    if (!containerRef.current || data.length === 0 || !isOpen) return;

    // Transform flat data for multi-line G2Plot
    const plotData: any[] = [];
    data.forEach(item => {
      plotData.push({ date: item.date, value: item.strategy, type: '本策略' });
      plotData.push({ date: item.date, value: item.benchmark, type: '基准' });
    });

    if (chartRef.current) {
      chartRef.current.changeData(plotData);
    } else {
      chartRef.current = new Line(containerRef.current, {
        data: plotData,
        xField: 'date',
        yField: 'value',
        seriesField: 'type',
        smooth: true,
        legend: { position: 'top' },
        color: ['#4f46e5', '#94a3b8'],
        tooltip: {
          shared: true,
          showMarkers: true,
        },
        point: {
          size: 2,
          shape: 'circle',
        },
        interactions: [{ type: 'marker-active' }],
      });
      chartRef.current.render();
    }
  }, [data, isOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // 统计卡片数据
  const statisticsData = [
    { label: '年化收益', value: '+32.45%', valueStyle: { color: '#f43f5e' } },
    { label: '最大回撤', value: '-12.80%', valueStyle: { color: '#10b981' } },
    { label: '夏普比率', value: '1.85', valueStyle: { color: '#4f46e5' } },
    { label: '胜率', value: '62.5%', valueStyle: { color: '#3b82f6' } }
  ];

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1000}
      centered
      className="strategy-return-modal"
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {strategyName} - 策略监控详情
          </Title>
          <Text type="secondary">实时回测与基准收益对照 (最近60个交易日)</Text>
        </div>
      }
    >
      <Row gutter={[16, 16]}>
        {statisticsData.map((item, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card 
              style={{ 
                background: idx === 0 ? '#fff1f2' : 
                           idx === 1 ? '#ecfdf5' : 
                           idx === 2 ? '#eef2ff' : '#eff6ff',
                borderRadius: '12px'
              }}
            >
              <Statistic 
                title={<Text style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748b' }}>{item.label}</Text>}
                value={item.value}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <div 
        ref={containerRef} 
        style={{ 
          height: '400px', 
          width: '100%', 
          marginTop: '20px', 
          padding: '16px',
          background: 'rgba(248, 250, 252, 0.5)', 
          borderRadius: '12px',
          border: '1px solid #f1f5f9'
        }}
      />
      
      <div style={{ 
        marginTop: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        fontSize: '12px',
        color: '#94a3b8'
      }}>
        <div>* 历史收益不代表未来表现</div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4f46e5', marginRight: '4px' }}></span>
          <span style={{ marginRight: '16px' }}>本策略</span>
          <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#94a3b8', marginRight: '4px' }}></span>
          <span>基准指数</span>
        </div>
      </div>
    </Modal>
  );
};

export default StrategyReturnModal;