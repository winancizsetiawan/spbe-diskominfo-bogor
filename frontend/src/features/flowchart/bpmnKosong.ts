/** Titik awal diagram baru di editor: peristiwa awal, satu tugas, dan peristiwa akhir. */
export const BPMN_KOSONG = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definisi_baru" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Proses_baru" isExecutable="false">
    <bpmn:startEvent id="Mulai_baru" name="Mulai" />
    <bpmn:task id="Tugas_baru" name="Langkah pertama" />
    <bpmn:endEvent id="Selesai_baru" name="Selesai" />
    <bpmn:sequenceFlow id="Alur_baru_0" sourceRef="Mulai_baru" targetRef="Tugas_baru" />
    <bpmn:sequenceFlow id="Alur_baru_1" sourceRef="Tugas_baru" targetRef="Selesai_baru" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="Diagram_baru">
    <bpmndi:BPMNPlane id="Bidang_baru" bpmnElement="Proses_baru">
      <bpmndi:BPMNShape id="Mulai_baru_di" bpmnElement="Mulai_baru"><dc:Bounds x="150" y="102" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Tugas_baru_di" bpmnElement="Tugas_baru"><dc:Bounds x="246" y="80" width="100" height="80" /></bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Selesai_baru_di" bpmnElement="Selesai_baru"><dc:Bounds x="406" y="102" width="36" height="36" /></bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Alur_baru_0_di" bpmnElement="Alur_baru_0"><di:waypoint x="186" y="120" /><di:waypoint x="246" y="120" /></bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Alur_baru_1_di" bpmnElement="Alur_baru_1"><di:waypoint x="346" y="120" /><di:waypoint x="406" y="120" /></bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`
