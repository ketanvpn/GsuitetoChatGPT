"""Patches ChatService.py set_model to support modern ChatGPT models"""
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
        # GPT-5.4 family
        elif "gpt-5.4-pro" in self.origin_model or "gpt-5-4-pro" in self.origin_model:
            self.req_model = "gpt-5-4-pro"
        elif "gpt-5.4-mini" in self.origin_model or "gpt-5-4-mini" in self.origin_model:
            self.req_model = "gpt-5-4-mini"
        elif "gpt-5.4-nano" in self.origin_model or "gpt-5-4-nano" in self.origin_model:
            self.req_model = "gpt-5-4-nano"
        elif "gpt-5.4" in self.origin_model or "gpt-5-4" in self.origin_model:
            self.req_model = "gpt-5-4-thinking"
        # GPT-5.3
        elif "gpt-5.3" in self.origin_model or "gpt-5-3" in self.origin_model:
            self.req_model = "gpt-5-3"
        # GPT-5 base
        elif "gpt-5-mini" in self.origin_model:
            self.req_model = "gpt-5-mini"
        elif "gpt-5-nano" in self.origin_model:
            self.req_model = "gpt-5-nano"
        elif "gpt-5" in self.origin_model:
            self.req_model = "gpt-5"
        # o4 family
        elif "o4-mini-high" in self.origin_model:
            self.req_model = "o4-mini-high"
        elif "o4-mini" in self.origin_model:
            self.req_model = "o4-mini"
        # o3 family
        elif "o3-pro" in self.origin_model:
            self.req_model = "o3-pro"
        elif "o3-mini-high" in self.origin_model:
            self.req_model = "o3-mini-high"
        elif "o3-mini" in self.origin_model:
            self.req_model = "o3-mini"
        elif "o3" in self.origin_model:
            self.req_model = "o3"
        # o1 family
        elif "o1-pro" in self.origin_model:
            self.req_model = "o1-pro"
        elif "o1-preview" in self.origin_model:
            self.req_model = "o1-preview"
        elif "o1-mini" in self.origin_model:
            self.req_model = "o1-mini"
        elif "o1" in self.origin_model:
            self.req_model = "o1"
        # GPT-4.5
        elif "gpt-4.5" in self.origin_model:
            self.req_model = "gpt-4.5o"
        # GPT-4.1 family
        elif "gpt-4.1-mini" in self.origin_model:
            self.req_model = "gpt-4.1-mini"
        elif "gpt-4.1" in self.origin_model:
            self.req_model = "gpt-4.1"
        # GPT-4o family
        elif "gpt-4o-canmore" in self.origin_model:
            self.req_model = "gpt-4o-canmore"
        elif "gpt-4o-mini" in self.origin_model:
            self.req_model = "gpt-4o-mini"
        elif "gpt-4o" in self.origin_model:
            self.req_model = "gpt-4o"
        # GPT-4 legacy
        elif "gpt-4-mobile" in self.origin_model:
            self.req_model = "gpt-4-mobile"
        elif "gpt-4" in self.origin_model:
            self.req_model = "gpt-4"
        # GPT-3.5
        elif "gpt-3.5" in self.origin_model:
            self.req_model = "text-davinci-002-render-sha"
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
