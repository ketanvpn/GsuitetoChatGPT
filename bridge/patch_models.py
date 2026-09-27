"""Patches ChatService.py set_model to support modern ChatGPT models (aligned with 9Router Codex)"""
import re

PATCH = '''    async def set_model(self):
        self.origin_model = self.data.get("model", "gpt-3.5-turbo-0125")
        self.resp_model = model_proxy.get(self.origin_model, self.origin_model)
        if "gizmo" in self.origin_model or "g-" in self.origin_model:
            self.gizmo_id = "g-" + self.origin_model.split("g-")[-1]
        else:
            self.gizmo_id = None

        # GPT-6 Astra (Sep 2026)
        if "gpt-6-astra" in self.origin_model:
            self.req_model = "gpt-6-astra"
        elif "gpt-6-sol" in self.origin_model:
            self.req_model = "gpt-6-sol"
        elif "gpt-6-luna" in self.origin_model:
            self.req_model = "gpt-6-luna"
        # GPT-5.6 family (Jul 2026)
        elif "gpt-5.6-sol" in self.origin_model or "gpt-5-6-sol" in self.origin_model:
            self.req_model = "gpt-5-6-sol"
        elif "gpt-5.6-terra" in self.origin_model or "gpt-5-6-terra" in self.origin_model:
            self.req_model = "gpt-5-6-terra"
        elif "gpt-5.6-luna" in self.origin_model or "gpt-5-6-luna" in self.origin_model:
            self.req_model = "gpt-5-6-luna"
        # GPT-5.5
        elif "gpt-5.5" in self.origin_model or "gpt-5-5" in self.origin_model:
            self.req_model = "gpt-5-5"
        # GPT-5.4
        elif "gpt-5.4-mini" in self.origin_model or "gpt-5-4-mini" in self.origin_model:
            self.req_model = "gpt-5-4-mini"
        elif "gpt-5.4" in self.origin_model or "gpt-5-4" in self.origin_model:
            self.req_model = "gpt-5-4-thinking"
        # GPT-5.3
        elif "gpt-5.3" in self.origin_model or "gpt-5-3" in self.origin_model:
            self.req_model = "gpt-5-3"
        # Auto
        elif "auto" in self.origin_model:
            self.req_model = "auto"
        else:
            self.req_model = self.origin_model
'''

with open('/app/chatgpt/ChatService.py', 'r') as f:
    content = f.read()

pattern = r'(    async def set_model\(self\):.*?)(\n    async def )'
match = re.search(pattern, content, re.DOTALL)
if match:
    new_content = content[:match.start()] + PATCH + match.group(2) + content[match.end():]
    with open('/app/chatgpt/ChatService.py', 'w') as f:
        f.write(new_content)
    print('Patched set_model successfully')
else:
    print('WARNING: Could not find set_model method to patch')
