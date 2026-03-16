import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AgentDelegatorModule = buildModule("AgentDelegatorModule", (m) => {
  const agentDelegator = m.contract("AgentDelegator");

  return { agentDelegator };
});

export default AgentDelegatorModule;
